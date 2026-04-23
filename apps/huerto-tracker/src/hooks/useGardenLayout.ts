import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const GRID_ROWS = 7;
export const GRID_COLS = 5;
export const GRID_SIZE = GRID_ROWS * GRID_COLS;

const LAYOUT_KEY = '@portfolio/huerto/garden_layout';

// null = empty cell, string = plantId
export type GridLayout = (string | null)[];

function emptyGrid(): GridLayout {
  return Array(GRID_SIZE).fill(null);
}

export function cellIndex(row: number, col: number): number {
  return row * GRID_COLS + col;
}

export function useGardenLayout() {
  const [layout, setLayout] = useState<GridLayout>(emptyGrid);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(LAYOUT_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as GridLayout;
          // Pad / trim to GRID_SIZE in case size changed
          const normalized = Array.from({ length: GRID_SIZE }, (_, i) => saved[i] ?? null);
          setLayout(normalized);
        } catch {}
      }
      setLoading(false);
    });
  }, []);

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
    const empty = emptyGrid();
    setLayout(empty);
    await AsyncStorage.setItem(LAYOUT_KEY, JSON.stringify(empty));
  }

  function plantIndexInGrid(plantId: string): number {
    return layout.indexOf(plantId);
  }

  return { layout, loading, setCell, removePlant, clearAll, plantIndexInGrid };
}
