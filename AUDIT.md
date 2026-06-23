# Auditoría huerto-tracker — 2026-06-23

Pasada de solo lectura. Sin cambios de código. Cada hallazgo verificado en el archivo fuente.

---

## P0 — Pérdida de datos / Crash

| Archivo:línea | Problema | Por qué importa | Fix propuesto |
|---|---|---|---|
| `app/costs.tsx:249` | `costEntries.remove(entry.id)` hard-delete al borrar entrada de coste | Borra el registro de AsyncStorage sin tombstone; en otro dispositivo el registro reaparece en el siguiente `syncFromCloud` | Cambiar a `costEntries.softRemove(entry.id)` |

---

## P1 — Seguridad / Monetización rota

| Archivo:línea | Problema | Por qué importa | Fix propuesto |
|---|---|---|---|
| `src/i18n/locales/es.json:191` (y ca/en/eu/gl/val) | `"freeLimit": "Gratis: hasta 20 plantas · 2 huertos"` — valores incorrectos | Código real: 5 plantas (`plant/new.tsx:63`) y 1 huerto (`gardens.tsx:36`). El usuario free ve en el paywall y ajustes un límite más permisivo del real; crea expectativas falsas y puede provocar chargebacks | Cambiar a `"hasta 5 plantas · 1 huerto"` en los 6 locales |
| `app/(tabs)/settings.tsx:32` | `APP_STORE_URL = 'https://apps.apple.com/app/id<APP_STORE_ID>'` con placeholder sin reemplazar | El botón "Valorar la app" (línea 481) abre una URL rota en producción; rating = cero reseñas orgánicas | Sustituir `<APP_STORE_ID>` con el ID real cuando se publique, o esconder el botón hasta entonces |
| `supabase/functions/ai-chat/index.ts` | Función `ai-chat` sin rate limiting | `ai-proxy` tiene límite de 20 llamadas/hora por usuario; `ai-chat` no tiene ninguno. Usuario Pro autenticado puede llamar directamente a la función desde curl sin límite y generar costes ilimitados en Anthropic | Añadir la misma lógica `increment_ai_usage` que tiene `ai-proxy` (ya existe el RPC y la tabla) |
| `apps/huerto-tracker/apps/huerto-tracker/.env` | Archivo `.env` con `EXPO_PUBLIC_DEV_PRO=true` dentro de la carpeta basura del repo | `usePro.ts:4` lo guarda con `__DEV__ &&` — producción segura. Pero el archivo existe en el worktree; si un pipeline CI/CD hace `source .env` en el directorio equivocado podría activar el flag en un build de release | Eliminar toda la carpeta `apps/huerto-tracker/apps/huerto-tracker/` (señalada en CLAUDE.md como basura) |

---

## P2 — Flujos rotos / UX incompleto

Ningún hallazgo P2 confirmado durante esta pasada. Los candidatos evaluados:

- **`app/plant/[id].tsx` non-null assertions** (`plant!`, `crop!`) — seguros: hay guard explícito `if (!plant || !crop) return` en línea 186.
- **`src/sync/photoSync.ts` race condition aparente** — mutación in-place seguida de `writeLocal` condicional es diseño intencional; no hay llamada concurrente sin lock.
- **`useSyncProvider.ts` secuencia first-login** — `syncToCloud → syncFromCloud` es secuencial (`.then`). Sin race dura.
- **`app/reminder/new.tsx`** — usa chips, no `TextInput` libre para fechas. Conforme al patrón de CLAUDE.md.

### [DUDA] — Requiere confirmación

| Archivo | Duda |
|---|---|
| `app/(tabs)/calendar.tsx`, `app/garden/map.tsx`, `app/stats.tsx`, `app/costs.tsx` | `useFocusEffect(useCallback(fn, []))` con deps vacío capturando `refresh()` y `activeGarden?.id`. En la práctica las refs son estables, pero ESLint lo flagea y puede ocultar bugs futuros. ¿Es intencional no actualizar el efecto cuando cambia activeGarden? |

---

## P3 — Deuda técnica / Consistencia

| Archivo:línea | Problema | Por qué importa | Fix propuesto |
|---|---|---|---|
| `apps/huerto-tracker/apps/huerto-tracker/` | Carpeta residual con `node_modules/expo-print/`, `package.json`, `package-lock.json`, `.env` (~50 MB de basura) | Genera confusión, contiene el `.env` de P1, puede interferir con herramientas que escanean el repo (gitingest, grep recursivo) | `Remove-Item -Recurse -Force apps/huerto-tracker/apps/` |
| `tools.tsx:48-49` | `badge: isPro ? undefined : 'Pro parcial'` en Companions — literal "Pro parcial" no pasa por `t()` | Texto visible al usuario sin clave i18n; incumple regla obligatoria del CLAUDE.md | Crear clave `paywall.badgeProPartial` y usar `t('paywall.badgeProPartial')` |

---

## Cobertura del audit

Archivos revisados directamente:

- `app/costs.tsx`, `app/plant/new.tsx`, `app/plant/[id].tsx`, `app/reminder/new.tsx`
- `app/gardens.tsx`, `app/rotation.tsx`, `app/chat.tsx`
- `app/(tabs)/settings.tsx`, `app/(tabs)/tools.tsx`
- `src/i18n/locales/es.json` + 5 locales
- `src/sync/useSyncProvider.ts`, `src/sync/photoSync.ts`
- `supabase/functions/ai-chat/index.ts`, `ai-vision/index.ts`, `ai-proxy/index.ts`
- `apps/huerto-tracker/apps/huerto-tracker/.env`

Edge functions de seguridad: LIMPIAS — todas verifican JWT (`supabase.auth.getUser()`), ninguna expone `ANTHROPIC_KEY` al cliente.
