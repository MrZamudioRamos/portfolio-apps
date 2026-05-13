import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { CROPS_BY_ID } from '../data/crops';
import { PLANT_STATUS_CONFIG } from '../models/plant';
import type { Plant } from '../models/plant';
import type { Garden } from '../models/garden';
import type { DiaryEntry } from '../models/diary-entry';

function buildHtml(
  garden: Garden,
  plants: Plant[],
  entries: DiaryEntry[],
  t: (key: string, opts?: any) => string
): string {
  const year = new Date().getFullYear();
  const harvestEntries = entries.filter((e) => e.type === 'harvest');
  const totalKg = harvestEntries.reduce((sum, e) => {
    const w = (e.data as any)?.weight;
    const parsed = typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0;
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const plantRows = plants
    .map((p) => {
      const crop = CROPS_BY_ID[p.cropId];
      const status = PLANT_STATUS_CONFIG[p.status];
      const plantHarvests = harvestEntries.filter((e) => e.plantId === p.id);
      const plantKg = plantHarvests.reduce((sum, e) => {
        const w = (e.data as any)?.weight;
        const parsed = typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0;
        return sum + (isNaN(parsed) ? 0 : parsed);
      }, 0);
      const goalBar = p.harvestGoalKg && plantKg > 0
        ? `<div style="margin-top:4px;background:#eee;border-radius:4px;height:6px;width:100%;"><div style="background:${plantKg >= p.harvestGoalKg ? '#4CAF50' : '#FF7043'};width:${Math.min((plantKg / p.harvestGoalKg) * 100, 100)}%;height:6px;border-radius:4px;"></div></div><small>${plantKg.toFixed(1)} / ${p.harvestGoalKg} kg</small>`
        : '';
      return `
        <tr>
          <td>${crop?.emoji ?? '🌱'} ${p.name}${p.variety ? ` <small style="color:#888">${p.variety}</small>` : ''}</td>
          <td>${status.emoji} ${status.label}</td>
          <td>${plantHarvests.length > 0 ? `${plantHarvests.length}x${plantKg > 0 ? ` · ${plantKg.toFixed(2)} kg` : ''}${goalBar}` : '—'}</td>
        </tr>`;
    })
    .join('');

  const monthActivity = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    const count = entries.filter((e) => e.date.startsWith(key)).length;
    return { month: key, count };
  }).filter((m) => m.count > 0);

  const activityRows = monthActivity
    .map((m) => {
      const d = new Date(`${m.month}-01T12:00:00`);
      const label = d.toLocaleDateString('es', { month: 'long', year: 'numeric' });
      return `<tr><td>${label}</td><td>${m.count} entradas</td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; }
    h1 { font-size: 22px; color: #2D7A3A; margin-bottom: 4px; }
    h2 { font-size: 15px; color: #2D7A3A; margin: 24px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px; }
    .summary-box { background: #f5f9f5; border: 1px solid #c8e6c9; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-num { font-size: 22px; font-weight: bold; color: #2D7A3A; }
    .summary-label { font-size: 11px; color: #666; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px 6px; background: #f5f9f5; font-size: 11px; color: #555; border-bottom: 2px solid #c8e6c9; }
    td { padding: 7px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 40px; color: #aaa; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <h1>🌱 ${garden.name}</h1>
  <div class="meta">Informe de temporada ${year} · Generado por Semilla</div>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="summary-num">${plants.length}</div>
      <div class="summary-label">Plantas</div>
    </div>
    <div class="summary-box">
      <div class="summary-num">${harvestEntries.length}</div>
      <div class="summary-label">Cosechas</div>
    </div>
    <div class="summary-box">
      <div class="summary-num">${totalKg > 0 ? totalKg.toFixed(1) + ' kg' : '—'}</div>
      <div class="summary-label">Cosechado</div>
    </div>
  </div>

  <h2>Plantas</h2>
  <table>
    <thead><tr><th>Planta</th><th>Estado</th><th>Cosechas</th></tr></thead>
    <tbody>${plantRows || '<tr><td colspan="3" style="color:#999;text-align:center;padding:16px;">Sin plantas registradas</td></tr>'}</tbody>
  </table>

  ${activityRows ? `
  <h2>Actividad ${year}</h2>
  <table>
    <thead><tr><th>Mes</th><th>Entradas</th></tr></thead>
    <tbody>${activityRows}</tbody>
  </table>` : ''}

  <div class="footer">Semilla — Planificador de Huerto · ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</body>
</html>`;
}

export function usePdfReport() {
  const [generating, setGenerating] = useState(false);

  async function generateAndShare(
    garden: Garden,
    plants: Plant[],
    entries: DiaryEntry[],
    t: (key: string, opts?: any) => string
  ): Promise<void> {
    setGenerating(true);
    try {
      const html = buildHtml(garden, plants, entries, t);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `Informe ${garden.name}`,
        });
      }
    } finally {
      setGenerating(false);
    }
  }

  return { generating, generateAndShare };
}
