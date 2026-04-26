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

const LAYOUT_KEY = '@portfolio/huerto/garden_layout';

// null = empty cell, string = plantId
export type GridLayout = (string | null)[];

export function cellIndex(row: number, col: number, cols: number): number {
  return row * cols + col;
}

export function useGardenLayout(
  gridRows: number = DEFAULT_GRID_ROWS,
  gridCols: number = DEFAULT_GRID_COLS,
) {
  const gridSize = gridRows * gridCols;
  const [layout, setLayout] = useState<GridLayout>(() => Array(gridSize).fill(null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(LAYOUT_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as GridLayout;
          // Pad / trim to current gridSize when size changes
          const normalized = Array.from({ length: gridSize }, (_, i) => saved[i] ?? null);
          setLayout(normalized);
        } catch {}
      } else {
        setLayout(Array(gridSize).fill(null));
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRows, gridCols]);

  async function setCell(index: number, plantId: string | null): Promise<void> {
    setLayout((prev) => {
      const next = [...prev];
      next[index] = plantId;
      AsyncStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function removePlant(plantId: string): Promise<void> {
    setLayout((prev) => {
      const next = prev.map((cell) => (cell === plantId ? null : cell));
      AsyncStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function clearAll(): Promise<void> {
    const empty = Array(gridSize).fill(null);
    setLayout(empty);
    await AsyncStorage.setItem(LAYOUT_KEY, JSON.stringify(empty));
  }

  function plantIndexInGrid(plantId: string): number {
    return layout.indexOf(plantId);
  }

  return { layout, loading, setCell, removePlant, clearAll, plantIndexInGrid, gridRows, gridCols, gridSize };
}
