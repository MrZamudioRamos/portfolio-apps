import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory AsyncStorage mock so we can exercise the real createStore logic.
const mem = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: async (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: async (k: string) => {
      mem.delete(k);
    },
  },
}));

// Import after the mock is registered. Relative path avoids the @portfolio alias
// (vitest has no path mapping configured).
import { createStore, type BaseItem } from '../../../../../packages/storage/src/store';

interface Item extends BaseItem {
  name: string;
}

beforeEach(() => mem.clear());

async function seed(store: ReturnType<typeof createStore<Item>>, n: number) {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const it = await store.create({ name: `item-${i}` } as Omit<Item, keyof BaseItem>);
    ids.push(it.id);
  }
  return ids;
}

describe('createStore soft-delete + concurrency', () => {
  it('softRemove marks deletedAt and bumps updatedAt without dropping the row', async () => {
    const store = createStore<Item>('t1');
    const [id] = await seed(store, 1);

    await store.softRemove(id);
    const all = await store.getAll();

    expect(all).toHaveLength(1); // row kept so the tombstone can sync
    expect(all[0].deletedAt).toBeTruthy();
    expect(all[0].updatedAt).toBe(all[0].deletedAt);
  });

  it('parallel softRemove calls do not clobber each other (mutex)', async () => {
    const store = createStore<Item>('t2');
    const ids = await seed(store, 6);

    // Without serialized writes, these racing read-modify-writes would lose all
    // but the last one. With the mutex, every row must end up soft-deleted.
    await Promise.all(ids.map((id) => store.softRemove(id)));

    const all = await store.getAll();
    expect(all).toHaveLength(6);
    expect(all.every((i) => i.deletedAt)).toBe(true);
  });

  it('softRemoveMany tombstones a batch in one write', async () => {
    const store = createStore<Item>('t3');
    const ids = await seed(store, 4);

    await store.softRemoveMany(ids.slice(0, 3));

    const all = await store.getAll();
    const deleted = all.filter((i) => i.deletedAt);
    const live = all.filter((i) => !i.deletedAt);
    expect(deleted).toHaveLength(3);
    expect(live).toHaveLength(1);
    expect(live[0].id).toBe(ids[3]);
  });

  it('removeMany still hard-deletes (no row left)', async () => {
    const store = createStore<Item>('t4');
    const ids = await seed(store, 3);

    await store.removeMany(ids.slice(0, 2));

    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(ids[2]);
  });
});
