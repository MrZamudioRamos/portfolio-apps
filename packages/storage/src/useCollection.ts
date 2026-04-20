import { useCallback, useEffect, useState } from 'react';
import { BaseItem, createStore, Store } from './store';

export interface UseCollectionResult<T extends BaseItem> {
  items: T[];
  loading: boolean;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => T | undefined;
  refresh: () => Promise<void>;
  count: number;
}

export function useCollection<T extends BaseItem>(key: string): UseCollectionResult<T> {
  const [store] = useState<Store<T>>(() => createStore<T>(key));
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await store.getAll();
      const sorted = [...all].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setItems(sorted);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
      const item = await store.create(data);
      await refresh();
      return item;
    },
    [store, refresh]
  );

  const update = useCallback(
    async (id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const item = await store.update(id, data);
      await refresh();
      return item;
    },
    [store, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await store.remove(id);
      await refresh();
    },
    [store, refresh]
  );

  const getById = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items]
  );

  return {
    items,
    loading,
    create,
    update,
    remove,
    getById,
    refresh,
    count: items.length,
  };
}
