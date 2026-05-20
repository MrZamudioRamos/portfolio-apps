import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import type { DiaryEntry } from '../models/diary-entry';
import type { Plant } from '../models/plant';
import { CROPS_BY_ID } from '../data/crops';
import { ENTRY_TYPE_CONFIG } from '../models/diary-entry';

function escapeCsv(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

const HEADERS = [
  'Fecha', 'Tipo', 'Planta', 'Cultivo', 'Notas',
  'Litros', 'Peso', 'Unidad', 'Calidad (1-5)',
  'Producto', 'Cantidad', 'Unidad cantidad', 'Dosis', 'Carencia (días)',
];

export function useCsvExport() {
  const [exporting, setExporting] = useState(false);

  async function exportEntries(entries: DiaryEntry[], plants: Plant[]): Promise<void> {
    if (exporting) return;
    setExporting(true);
    try {
      const plantsById = Object.fromEntries(plants.map((p) => [p.id, p]));

      const rows = [...entries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => {
          const plant = e.plantId ? plantsById[e.plantId] : null;
          const crop = plant ? CROPS_BY_ID[plant.cropId] : null;
          const d = (e.data ?? {}) as Record<string, unknown>;
          return [
            e.date,
            ENTRY_TYPE_CONFIG[e.type]?.label ?? e.type,
            plant?.name ?? '',
            crop?.name ?? '',
            e.notes ?? '',
            d.liters ?? '',
            d.weight ?? '',
            d.unit ?? '',
            d.quality ?? '',
            d.product ?? '',
            d.amount ?? '',
            d.amountUnit ?? '',
            d.dose ?? '',
            d.waitDays ?? '',
          ].map(escapeCsv).join(',');
        });

      const csv = [HEADERS.map(escapeCsv).join(','), ...rows].join('\r\n');
      const date = new Date().toISOString().slice(0, 10);
      const filename = `huerto-diario-${date}.csv`;
      const path = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(path, '﻿' + csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: filename,
      });
    } finally {
      setExporting(false);
    }
  }

  return { exportEntries, exporting };
}
