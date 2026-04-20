import AsyncStorage from '@react-native-async-storage/async-storage';

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `${timestamp}-${random}`;
}

export interface BaseItem {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store<T extends BaseItem> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T | null>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  count: () => Promise<number>;
}

export function createStore<T extends BaseItem>(key: string): Store<T> {
  const storageKey = `@portfolio/${key}`;

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

  return {
    async getAll() {
      return readAll();
    },

    async getById(id) {
      const items = await readAll();
      return items.find((item) => item.id === id) ?? null;
    },

    async create(data) {
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
    },

    async update(id, data) {
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
    },

    async remove(id) {
      const items = await readAll();
      await writeAll(items.filter((item) => item.id !== id));
    },

    async clear() {
      await AsyncStorage.removeItem(storageKey);
    },

    async count() {
      const items = await readAll();
      return items.length;
    },
  };
}
