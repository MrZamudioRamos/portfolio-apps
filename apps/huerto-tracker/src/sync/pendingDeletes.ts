import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteRow } from '@portfolio/supabase';

/**
 * Offline-safe deletion queue.
 *
 * AsyncStorage deletes are local only; the matching cloud row must also be
 * removed or the next `syncFromCloud` will re-add ("resurrect") the item.
 * If the device is offline when the user deletes, the direct `deleteRow`
 * call fails silently — so we persist a tombstone and:
 *   1. flush it on every sync push (`flushPendingDeletes`)
 *   2. skip re-adding queued ids on sync pull (`getPendingDeleteIds`)
 */

const QUEUE_KEY = '@portfolio/pending_deletes';

export interface PendingDelete {
  table: string;
  id: string;
}

async function readQueue(): Promise<PendingDelete[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingDelete[];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingDelete[]): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return;
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

// Serialize queue read-modify-write (same hazard as the storage layer).
let lock: Promise<unknown> = Promise.resolve();
function withLock<R>(fn: () => Promise<R>): Promise<R> {
  const run = lock.then(fn, fn);
  lock = run.then(() => undefined, () => undefined);
  return run;
}

/** Record a tombstone so the deletion survives an offline window. */
export function enqueueDeletes(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  return withLock(async () => {
    const queue = await readQueue();
    const seen = new Set(queue.map((d) => `${d.table}:${d.id}`));
    for (const id of ids) {
      const k = `${table}:${id}`;
      if (!seen.has(k)) {
        queue.push({ table, id });
        seen.add(k);
      }
    }
    await writeQueue(queue);
  });
}

/**
 * Delete now if online, else leave the tombstone for the next flush.
 * Always enqueues first so a mid-flight failure is retried.
 */
export async function removeFromCloud(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await enqueueDeletes(table, ids);
  await flushPendingDeletes();
}

/** Push every queued tombstone to the cloud; drop the ones that succeed. */
export async function flushPendingDeletes(): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) return;

  const results = await Promise.allSettled(
    queue.map((d) => deleteRow(d.table, d.id))
  );

  const stillPending = queue.filter((_, i) => results[i].status === 'rejected');
  await withLock(async () => {
    // Re-read in case new tombstones were enqueued during the flush.
    const current = await readQueue();
    const flushedKeys = new Set(
      queue
        .filter((_, i) => results[i].status === 'fulfilled')
        .map((d) => `${d.table}:${d.id}`)
    );
    const remaining = current.filter((d) => !flushedKeys.has(`${d.table}:${d.id}`));
    await writeQueue(remaining);
    void stillPending;
  });
}

/** Ids queued for deletion in a table — sync pull must not re-add these. */
export async function getPendingDeleteIds(table: string): Promise<Set<string>> {
  const queue = await readQueue();
  return new Set(queue.filter((d) => d.table === table).map((d) => d.id));
}
