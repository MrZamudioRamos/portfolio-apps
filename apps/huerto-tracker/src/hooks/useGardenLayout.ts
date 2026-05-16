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

const layoutKey = (gardenId: string) => `@portfolio/huerto/garden_layout/${gardenId}`;

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

  useEffect(() => {
    if (!gardenId) {
      setLayout(Array(gridSize).fill(null));
      setLoading(false);
      return;
    }
    setLoading(true);
    AsyncStorage.getItem(layoutKey(gardenId)).then((raw) => {
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
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardenId, gridRows, gridCols]);

  async function setCell(index: number, plantId: string | null): Promise<void> {
    if (!gardenId) return;
    setLayout((prev) => {
      const next = [...prev];
      next[index] = plantId;
      AsyncStorage.setItem(layoutKey(gardenId), JSON.stringify(next));
      return next;
    });
  }

  async function removePlant(plantId: string): Promise<void> {
    if (!gardenId) return;
    setLayout((prev) => {
      const next = prev.map((cell) => (cell === plantId ? null : cell));
      AsyncStorage.setItem(layoutKey(gardenId), JSON.stringify(next));
      return next;
    });
  }

  async function swapCells(a: number, b: number): Promise<void> {
    if (!gardenId) return;
    setLayout((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      AsyncStorage.setItem(layoutKey(gardenId), JSON.stringify(next));
      return next;
    });
  }

  async function clearAll(): Promise<void> {
    if (!gardenId) return;
    const empty = Array(gridSize).fill(null);
    setLayout(empty);
    await AsyncStorage.setItem(layoutKey(gardenId), JSON.stringify(empty));
  }

  function plantIndexInGrid(plantId: string): number {
    return layout.indexOf(plantId);
  }

  return { layout, loading, setCell, swapCells, removePlant, clearAll, plantIndexInGrid, gridRows, gridCols, gridSize };
}
