import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { CROPS_BY_ID } from '../data/crops';
import { PLANT_STATUS_CONFIG } from '../models/plant';
import type { Plant } from '../models/plant';
import type { Garden } from '../models/garden';
import type { DiaryEntry } from '../models/diary-entry';

function parseNum(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') { const n = parseFloat(val); return isNaN(n) ? 0 : n; }
  return 0;
}

function buildHtml(
  garden: Garden,
  plants: Plant[],
  entries: DiaryEntry[],
  t: (key: string, opts?: any) => string
): string {
  const year = new Date().getFullYear();
  const harvestEntries = entries.filter((e) => e.type === 'harvest');
  const waterEntries = entries.filter((e) => e.type === 'watering');
  const treatmentEntries = entries.filter((e) => e.type === 'treatment');

  const totalKg = harvestEntries.reduce((sum, e) => sum + parseNum((e.data as any)?.weight), 0);
  const totalLiters = waterEntries.reduce((sum, e) => sum + parseNum((e.data as any)?.liters), 0);
  const qualityHarvests = harvestEntries.filter((e) => (e.data as any)?.quality);
  const avgQuality = qualityHarvests.length > 0
    ? (qualityHarvests.reduce((s, e) => s + parseNum((e.data as any).quality), 0) / qualityHarvests.length).toFixed(1)
    : null;

  const SOIL_TEXTURE_ES: Record<string, string> = {
    sandy: 'Arenoso', loamy: 'Franco', clay: 'Arcilloso', silty: 'Limoso', peaty: 'Turboso',
  };

  const plantRows = plants
    .map((p) => {
      const crop = CROPS_BY_ID[p.cropId];
      const status = PLANT_STATUS_CONFIG[p.status];
      const plantHarvests = harvestEntries.filter((e) => e.plantId === p.id);
      const plantKg = plantHarvests.reduce((sum, e) => sum + parseNum((e.data as any)?.weight), 0);
      const plantLiters = waterEntries.filter((e) => e.plantId === p.id).reduce((sum, e) => sum + parseNum((e.data as any)?.liters), 0);
      const qualH = plantHarvests.filter((e) => (e.data as any)?.quality);
      const pAvgQ = qualH.length > 0 ? (qualH.reduce((s, e) => s + parseNum((e.data as any).quality), 0) / qualH.length).toFixed(1) : null;
      const goalBar = p.harvestGoalKg && plantKg > 0
        ? `<div style="margin-top:4px;background:#eee;border-radius:4px;height:6px;width:100%;"><div style="background:${plantKg >= p.harvestGoalKg ? '#4CAF50' : '#FF7043'};width:${Math.min((plantKg / p.harvestGoalKg) * 100, 100)}%;height:6px;border-radius:4px;"></div></div><small>${plantKg.toFixed(1)} / ${p.harvestGoalKg} kg</small>`
        : '';
      const soilBits = [
        p.soilPh ? `pH ${p.soilPh}` : '',
        p.soilTexture ? SOIL_TEXTURE_ES[p.soilTexture] ?? p.soilTexture : '',
        p.bedName ? `Parcela: ${p.bedName}` : '',
      ].filter(Boolean).join(' · ');
      const lastTreatment = [...treatmentEntries]
        .filter((e) => e.plantId === p.id && (e.data as any)?.waitDays)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const carenciaInfo = lastTreatment
        ? (() => {
            const waitDays = parseNum((lastTreatment.data as any).waitDays);
            const treatDate = new Date(lastTreatment.date + 'T12:00:00');
            const safeDate = new Date(treatDate.getTime() + waitDays * 86_400_000);
            const daysLeft = Math.ceil((safeDate.getTime() - Date.now()) / 86_400_000);
            const product = (lastTreatment.data as any)?.product ?? '';
            return daysLeft > 0
              ? `<span style="color:#EF5350">⚠️ Carencia: ${product ? product + ' · ' : ''}${daysLeft}d restantes</span>`
              : `<span style="color:#4CAF50">✓ ${product ? product + ' · ' : ''}Carencia cumplida</span>`;
          })()
        : '';
      return `
        <tr>
          <td>${crop?.emoji ?? '🌱'} <strong>${p.name}</strong>${p.variety ? ` <small style="color:#888">${p.variety}</small>` : ''}<br/>${soilBits ? `<small style="color:#999">${soilBits}</small>` : ''}</td>
          <td>${status.emoji} ${status.label}${carenciaInfo ? '<br/>' + carenciaInfo : ''}</td>
          <td>${plantHarvests.length > 0 ? `${plantHarvests.length}x${plantKg > 0 ? ` · ${plantKg.toFixed(2)} kg` : ''}${pAvgQ ? ` · ⭐${pAvgQ}` : ''}${goalBar}` : '—'}</td>
          <td>${plantLiters > 0 ? `💧 ${Math.round(plantLiters)} L` : '—'}</td>
        </tr>`;
    })
    .join('');

  const treatRows = treatmentEntries
    .filter((e) => (e.data as any)?.product || (e.data as any)?.waitDays)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map((e) => {
      const plant = plants.find((p) => p.id === e.plantId);
      const d = (e.data as any);
      const waitDays = parseNum(d?.waitDays);
      const safeDate = waitDays > 0
        ? new Date(new Date(e.date + 'T12:00:00').getTime() + waitDays * 86_400_000).toLocaleDateString('es', { day: 'numeric', month: 'short' })
        : null;
      return `<tr>
        <td>${e.date}</td>
        <td>${plant ? `${CROPS_BY_ID[plant.cropId]?.emoji ?? '🌱'} ${plant.name}` : '—'}</td>
        <td>${d?.product ?? '—'}</td>
        <td>${d?.dose ?? '—'}</td>
        <td>${waitDays > 0 ? `${waitDays}d (hasta ${safeDate})` : '—'}</td>
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
      const litersMonth = waterEntries
        .filter((e) => e.date.startsWith(m.month))
        .reduce((sum, e) => sum + parseNum((e.data as any)?.liters), 0);
      return `<tr><td>${label}</td><td>${m.count}</td><td>${litersMonth > 0 ? `${Math.round(litersMonth)} L` : '—'}</td></tr>`;
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
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }
    .summary-box { background: #f5f9f5; border: 1px solid #c8e6c9; border-radius: 8px; padding: 10px; text-align: center; }
    .summary-num { font-size: 20px; font-weight: bold; color: #2D7A3A; }
    .summary-label { font-size: 10px; color: #666; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px 6px; background: #f5f9f5; font-size: 11px; color: #555; border-bottom: 2px solid #c8e6c9; }
    td { padding: 7px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 40px; color: #aaa; font-size: 11px; text-align: center; }
    .warning { color: #EF5350; }
    .safe { color: #4CAF50; }
  </style>
</head>
<body>
  <h1>🌱 ${garden.name}</h1>
  <div class="meta">Informe de temporada ${year} · Generado por Semilla el ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="summary-num">${plants.length}</div>
      <div class="summary-label">Plantas</div>
    </div>
    <div class="summary-box">
      <div class="summary-num">${totalKg > 0 ? totalKg.toFixed(1) + ' kg' : '—'}</div>
      <div class="summary-label">Cosechado</div>
    </div>
    <div class="summary-box">
      <div class="summary-num">${totalLiters > 0 ? Math.round(totalLiters) + ' L' : '—'}</div>
      <div class="summary-label">Agua usada</div>
    </div>
    <div class="summary-box">
      <div class="summary-num">${avgQuality ? '⭐' + avgQuality : '—'}</div>
      <div class="summary-label">Calidad media</div>
    </div>
  </div>

  <h2>Plantas</h2>
  <table>
    <thead><tr><th>Planta</th><th>Estado</th><th>Cosechas</th><th>Agua</th></tr></thead>
    <tbody>${plantRows || '<tr><td colspan="4" style="color:#999;text-align:center;padding:16px;">Sin plantas registradas</td></tr>'}</tbody>
  </table>

  ${treatRows ? `
  <h2>⚠️ Registro de tratamientos fitosanitarios</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Planta</th><th>Producto</th><th>Dosis</th><th>Carencia</th></tr></thead>
    <tbody>${treatRows}</tbody>
  </table>` : ''}

  ${activityRows ? `
  <h2>Actividad ${year}</h2>
  <table>
    <thead><tr><th>Mes</th><th>Entradas</th><th>Agua</th></tr></thead>
    <tbody>${activityRows}</tbody>
  </table>` : ''}

  <div class="footer">Semilla — Planificador de Huerto</div>
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
