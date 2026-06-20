# portfolio-apps — guía para Claude Code

Monorepo Turborepo. Apps de utilidad para el mercado español, ASO-first,
freemium, sin adquisición pagada. Solo dev, ~10h/semana.

## Apps activas
- `apps/huerto-tracker` — **única app con desarrollo real activo.** Nombre
  comercial: **semilla** ("Semilla - Planificador de Huerto"). Tracker de
  huerto urbano para España.
- `apps/stitch-tally` — existe en el repo pero **sin desarrollo activo**.
  No tocar salvo petición explícita.

## Stack (huerto-tracker)
- Expo SDK 55, Expo Router, React 19, React Native 0.83, TypeScript strict
- Supabase (DB + Auth + Storage + Edge Functions) — capa de backend
- RevenueCat (vía `@portfolio/billing`) — monetización
- i18n: i18next, **6 locales obligatorios**: es (fallback), en, ca, eu, gl, val
- Analítica: PostHog (`posthog-react-native`)
- Sentry para crash reporting
- Tests: Vitest (`npm run test` desde `apps/huerto-tracker`)
- Gestos/animación: react-native-reanimated v4, react-native-copilot (tours)

## Paquetes compartidos (`packages/*`)
Todos tienen código real, no son solo nombres reservados:
`@portfolio/ui`, `@portfolio/storage`, `@portfolio/billing`,
`@portfolio/notifications`, `@portfolio/share`, `@portfolio/shared`,
`@portfolio/supabase`.

- **`@portfolio/storage`**: `useCollection<T extends BaseItem>(key)` sobre
  AsyncStorage. `BaseItem = { id, createdAt, updatedAt, deletedAt? }`.
  Mutaciones serializadas con un write-lock (AsyncStorage no es atómico).
  **Borrado es soft-delete por defecto** (`softRemove`/`softRemoveMany`
  ponen `deletedAt` para que la tombstone sincronice a otros dispositivos).
  Solo usar `remove`/`removeMany` (hard-delete) cuando de verdad no debe
  sincronizar el borrado.
- **`@portfolio/ui`**: `useColors()`, `useTheme()` (spacing, fontSize,
  fontWeight, radii, shadows), `Card`, `Button`. **Nunca hardcodear colores
  de UI estructural** — sí está aceptado un sistema de colores semánticos
  fijos para estados de dominio (salud de planta, agua, plagas, cosecha:
  `#4CAF50` éxito, `#EF5350`/`#F44336` error, `#FF7043` cosecha, `#29B6F6`
  agua, `#FFA726`/`#FF9800` aviso) — son consistentes en todo el código,
  no los cambies sin motivo.

## Comandos
Desde la raíz del repo (Turborepo):
```
npm run dev          # turbo run dev
npm run build         # turbo run build
npm run typecheck     # turbo run typecheck
npm run lint          # turbo run lint
```
Desde `apps/huerto-tracker` directamente:
```
npm run typecheck     # tsc --noEmit
npm run test          # vitest run
npm run test:watch    # vitest
```
**Siempre verificar `typecheck` y `test` tras cualquier cambio** en
huerto-tracker antes de dar una tarea por terminada.

## Modelos de datos clave (`apps/huerto-tracker/src/models/`)
- `Garden`: `{ name, climateZone, province, photoUri?, gardenType?, gridRows?, gridCols? }`.
  `climateZone` se deriva de `province` vía `PROVINCE_ZONES` (`src/data/zones.ts`):
  `atlantica | mediterranea | continental | subtropical`.
- `Plant`: `{ gardenId, cropId, name, variety?, varietyId?, sowingDate?,
  transplantDate?, firstHarvestDate?, status, photoUri?, notes?,
  pestStatus? }`. `status: PlantStatus` es una progresión lineal:
  `seedling → transplanted → growing → flowering → fruiting → harvesting → finished`.
- `DiaryEntry`: `{ gardenId, plantId?, type, date, notes?, photoUri?, data? }`.
- `CropInfo` (`src/data/crops.ts`): `sunNeeds: 'full' | 'partial' | 'shade'`,
  `daysToHarvest: [number, number]`, dificultad en `CROP_DIFFICULTY`.
  Ranking de sol para filtrado: `shade < partial < full` (apto si
  requerimiento del cultivo ≤ sol disponible del usuario/huerto).

## Perfil de usuario y coaching adaptativo
- `UserProfile`: incluye `experience: 'beginner' | 'some' | 'expert'`,
  `sunlight`, `coachingFloor`, `coachingOverride`.
- `useCoachingLevel()` deriva `'full' | 'light' | 'off'` combinando
  experiencia declarada + comportamiento real (`buildGamificationData` de
  `src/utils/gamification.ts`, que **se ejecuta siempre, para todo usuario,
  Pro o free** — solo la pantalla visual de logros está gateada a Pro, el
  cómputo nunca). El nivel es un **trinquete**: solo puede graduarse hacia
  `off`, nunca retrocede por sí solo (evita re-mostrar coaching básico a
  quien ya demostró experiencia). Aplicar como prop a componentes
  existentes — nunca duplicar pantallas por nivel de coaching.

## i18n — regla obligatoria
Cualquier string visible nuevo va con `t()` y su clave **debe** añadirse
como mínimo a `src/i18n/locales/es.json`. Para las otras 5 locales, usar
el valor en español como fallback si no hay traducción real, o ejecutar
`scripts/add_missing_i18n.py`. Nunca dejar un string sin clave i18n.

## Fechas en formularios
**Nunca usar `TextInput` de texto libre para fechas** (anti-patrón ya
corregido en casi toda la app). Usar el patrón ya establecido:
chips rápidos ("Hoy" / "Ayer") + `@react-native-community/datetimepicker`
para fecha exacta. Ver `app/entry/new.tsx` o `app/plant/new.tsx` como
referencia del patrón correcto antes de tocar cualquier selector de fecha.

## Monetización (RevenueCat vía `@portfolio/billing`)
Corte actual free/Pro (ver `app/paywall.tsx`, fuente de verdad):
- **Free**: hasta 5 plantas, diario sin límite de entradas, calendario de
  siembra, hasta 3 recordatorios por huerto, "qué sembrar este mes".
- **Pro**: plantas ilimitadas, mapa visual del huerto, asistente IA (chat +
  identificación por foto), recordatorios ilimitados, exportar datos,
  estadísticas avanzadas.
- Precio: 2,99€/mes o 19,99€/año, trial 7 días.
- Todo gate de paywall debe trackear `EVENTS.paywallViewed` con un
  `source` específico (`plant_limit`, `map`, `ai_chat`, `reminders`, etc.)
  — el embudo en PostHog depende de esto.
- **Cuidado**: `FREE_GARDEN_LIMIT` en `app/gardens.tsx` puede no estar
  sincronizado con la intención real de negocio — confirmar con el
  product owner antes de asumir su valor.

## Seguridad — nunca regresar a esto
- La API key de Anthropic **nunca** va en el cliente / bundle. Toda llamada
  a IA pasa por las Supabase Edge Functions existentes: `ai-chat`,
  `ai-vision`, `ai-proxy` (en `supabase/functions/`). El secret vive solo
  como `supabase secrets set` en el dashboard.
- Borrado de cuenta: Edge Function `delete-account` ya existe y hace
  cascade real vía `auth.admin.deleteUser`. La UI está en
  `app/(tabs)/settings.tsx`.
- Fotos: sync a Supabase Storage (bucket `photos`, público, con políticas
  RLS por carpeta `userId/...`) ya implementado en `src/sync/photoSync.ts`
  y `syncAll.ts`. Aplica a **cualquier usuario registrado**, no solo Pro.

## Cuidado con gitingest
Los nombres con corchetes de Expo Router (`app/plant/[id].tsx`) y a veces
archivos dentro de carpetas con paréntesis (`app/(tabs)/`) **se pierden
silenciosamente en gitingest** sin avisar — el árbol de directorios ni
siquiera los lista. Si un gitingest no incluye `app/(tabs)/index.tsx` o
`app/plant/[id].tsx`, no asumir que no existen: pedir el contenido
directamente (`Get-Content -Raw` o adjuntar el archivo) en vez de fiarse
del dump.

## Patrón de trabajo esperado
Antes de escribir o modificar código, **leer primero los archivos
relevantes existentes** (componentes, hooks, modelos) en vez de asumir su
forma o reimplementar algo que ya existe. La mayoría de features básicas
(coaching, recomendaciones por sol, notificaciones, sync de fotos,
borrado de cuenta, paywall) **ya están implementadas** — el trabajo
habitual es extender o corregir, no construir desde cero. Si una tarea
parece requerir reconstruir algo que "debería" existir, comprobar primero
si ya existe.

## Limpieza pendiente conocida
Existe una carpeta residual `apps/huerto-tracker/apps/huerto-tracker/`
con un `package.json` suelto (`{ "dependencies": { "expo-print": "..." } }`)
— probablemente de un comando ejecutado desde el directorio equivocado.
Es basura, no se usa. Eliminarla si se toca esa zona del repo.
