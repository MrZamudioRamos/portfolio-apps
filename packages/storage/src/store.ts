import AsyncStorage from '@react-native-async-storage/async-storage';

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export interface BaseItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Soft-delete tombstone. Set => row is deleted but kept so the deletion syncs. */
  deletedAt?: string;
}

export interface Store<T extends BaseItem> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T | null>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
  /** Atomic batch hard-delete — single read-modify-write, safe vs parallel callers. */
  removeMany: (ids: string[]) => Promise<void>;
  /** Soft-delete: mark deletedAt so the deletion can sync to other devices. */
  softRemove: (id: string) => Promise<void>;
  /** Atomic batch soft-delete. */
  softRemoveMany: (ids: string[]) => Promise<void>;
  clear: () => Promise<void>;
  count: () => Promise<number>;
}

export function createStore<T extends BaseItem>(key: string): Store<T> {
  const storageKey = `@portfolio/${key}`;

  // Serialize every mutation through a promise chain so concurrent
  // read-modify-write ops can't clobber each other (AsyncStorage has no
  // atomic update). Parallel callers queue instead of racing.
  let writeLock: Promise<unknown> = Promise.resolve();
  function withLock<R>(fn: () => Promise<R>): Promise<R> {
    const run = writeLock.then(fn, fn);
    // Keep the chain alive even if fn rejects.
    writeLock = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async function readAll(): Promise<T[]> {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  async function writeAll(items: T[]): Promise<void> {
    await AsyncStorage.setItem(storageKey, JSON.stringify(items));
  }

  function softRemoveManyImpl(ids: string[]): Promise<void> {
    if (ids.length === 0) return Promise.resolve();
    const idSet = new Set(ids);
    return withLock(async () => {
      const items = await readAll();
      const now = new Date().toISOString();
      await writeAll(
        items.map((item) =>
          idSet.has(item.id) ? { ...item, deletedAt: now, updatedAt: now } : item
        )
      );
    });
  }

  return {
    async getAll() {
      return readAll();
    },

    async getById(id) {
      const items = await readAll();
      return items.find((item) => item.id === id) ?? null;
    },

    create(data) {
      return withLock(async () => {
        const items = await readAll();
        const now = new Date().toISOString();
        const newItem = {
          ...data,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        } as unknown as T;
        items.push(newItem);
        await writeAll(items);
        return newItem;
      });
    },

    update(id, data) {
      return withLock(async () => {
        const items = await readAll();
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return null;
        const updated = {
          ...items[index],
          ...data,
          id,
          updatedAt: new Date().toISOString(),
        } as T;
        items[index] = updated;
        await writeAll(items);
        return updated;
      });
    },

    remove(id) {
      return withLock(async () => {
        const items = await readAll();
        await writeAll(items.filter((item) => item.id !== id));
      });
    },

    removeMany(ids) {
      if (ids.length === 0) return Promise.resolve();
      const idSet = new Set(ids);
      return withLock(async () => {
        const items = await readAll();
        await writeAll(items.filter((item) => !idSet.has(item.id)));
      });
    },

    softRemove(id) {
      return softRemoveManyImpl([id]);
    },

    softRemoveMany(ids) {
      return softRemoveManyImpl(ids);
    },

    clear() {
      return withLock(async () => {
        await AsyncStorage.removeItem(storageKey);
      });
    },

    async count() {
      const items = await readAll();
      return items.length;
    },
  };
}
