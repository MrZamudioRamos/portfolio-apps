import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const DEFAULT_GRID_ROWS = 7;
export const DEFAULT_GRID_COLS = 5;

// Keep legacy exports so existing imports don't break
export const GRID_ROWS = DEFAULT_GRID_ROWS;
export const GRID_COLS = DEFAULT_GRID_COLS;
export const GRID_SIZE = DEFAULT_GRID_ROWS * DEFAULT_GRID_COLS;

export const GRID_PRESETS = [
  { rows: 4, cols: 3 },
  { rows: 5, cols: 4 },
  { rows: 7, cols: 5 },
  { rows: 8, cols: 6 },
  { rows: 10, cols: 8 },
] as const;

export const gardenLayoutKey = (gardenId: string) => `@portfolio/huerto/garden_layout/${gardenId}`;
export const layoutTsKey = (gardenId: string) => `@portfolio/huerto/garden_layout/${gardenId}/ts`;

// null = empty cell, string = plantId
export type GridLayout = (string | null)[];

export function cellIndex(row: number, col: number, cols: number): number {
  return row * cols + col;
}

export function useGardenLayout(
  gardenId: string | undefined,
  gridRows: number = DEFAULT_GRID_ROWS,
  gridCols: number = DEFAULT_GRID_COLS,
) {
  const gridSize = gridRows * gridCols;
  const [layout, setLayout] = useState<GridLayout>(() => Array(gridSize).fill(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!gardenId) {
      setLayout(Array(gridSize).fill(null));
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    AsyncStorage.getItem(gardenLayoutKey(gardenId))
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw) as GridLayout;
            // Pad / trim to current gridSize when size changes
            const normalized = Array.from({ length: gridSize }, (_, i) => saved[i] ?? null);
            setLayout(normalized);
          } catch {
            setLayout(Array(gridSize).fill(null));
          }
        } else {
          setLayout(Array(gridSize).fill(null));
        }
      })
      // Defensive: a rejected AsyncStorage read used to leave `loading=true`
      // forever, leaving the entire map screen without a usable layout.
      // Degrade to an empty layout instead.
      .catch((reason) => {
        setLayout(Array(gridSize).fill(null));
        setError(reason instanceof Error ? reason : new Error('Could not load garden layout'));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardenId, gridRows, gridCols, reloadToken]);

  function writeLayout(gardenId: string, layout: GridLayout) {
    const now = new Date().toISOString();
    AsyncStorage.setItem(gardenLayoutKey(gardenId), JSON.stringify(layout));
    AsyncStorage.setItem(layoutTsKey(gardenId), now);
  }

  async function setCell(index: number, plantId: string | null): Promise<void> {
    if (!gardenId) return;
    setLayout((prev) => {
      const next = [...prev];
      next[index] = plantId;
      writeLayout(gardenId, next);
      return next;
    });
  }

  /** Place a plant in one cell, removing any previous occurrence first. */
  async function placePlant(plantId: string, index: number): Promise<void> {
    if (!gardenId) return;
    setLayout((prev) => {
      const next = prev.map((cell) => (cell === plantId ? null : cell));
      next[index] = plantId;
      writeLayout(gardenId, next);
      return next;
    });
  }

  async function removePlant(plantId: string): Promise<void> {
    if (!gardenId) return;
    setLayout((prev) => {
      const next = prev.map((cell) => (cell === plantId ? null : cell));
      writeLayout(gardenId, next);
      return next;
    });
  }

  async function swapCells(a: number, b: number): Promise<void> {
    if (!gardenId) return;
    setLayout((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      writeLayout(gardenId, next);
      return next;
    });
  }

  async function clearAll(): Promise<void> {
    if (!gardenId) return;
    const empty = Array(gridSize).fill(null);
    setLayout(empty);
    writeLayout(gardenId, empty);
  }

  function plantIndexInGrid(plantId: string): number {
    return layout.indexOf(plantId);
  }

  return {
    layout,
    loading,
    error,
    retry: () => setReloadToken((value) => value + 1),
    setCell,
    placePlant,
    swapCells,
    removePlant,
    clearAll,
    plantIndexInGrid,
    gridRows,
    gridCols,
    gridSize,
  };
}
