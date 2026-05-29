# Plan: soft-delete cross-device (tombstones sincronizados)

Estado: **propuesta**. No tocar BD hasta aprobar.

## Problema

`mergeLocal` (en `src/sync/syncAll.ts`) es **aditivo**: solo añade/actualiza ítems
que vienen del cloud, nunca borra ítems locales ausentes del pull. Y
`syncToCloud` re-sube TODO lo local con `upsertAll`.

Resultado — un borrado hecho en el dispositivo B resucita en A:

1. B borra planta `X` → `deleteRow` la quita de la tabla cloud.
2. A hace `syncFromCloud` → el pull no incluye `X` → `mergeLocal` no toca `X` local.
3. A hace `syncToCloud` → `upsertAll` re-sube `X` → **`X` vuelve al cloud y a B**.

La cola de tombstones local (`pendingDeletes.ts`, sprint anterior) solo cubre
borrados *del propio dispositivo en offline*. No hay forma de que A se entere de
un borrado hecho en B, porque "fila ausente" es indistinguible de "fila aún no
subida".

## Solución: soft-delete con `deleted_at`

En vez de `DELETE` físico, marcar `deleted_at` (timestamp). El borrado se
convierte en un dato que se sincroniza como cualquier otro campo.

### 1. Migración Supabase (8 tablas)

```sql
alter table gardens        add column deleted_at timestamptz;
alter table plants         add column deleted_at timestamptz;
alter table diary_entries  add column deleted_at timestamptz;
alter table reminders      add column deleted_at timestamptz;
alter table user_profiles  add column deleted_at timestamptz;
alter table custom_crops   add column deleted_at timestamptz;
alter table cost_entries   add column deleted_at timestamptz;
alter table garden_layouts add column deleted_at timestamptz;

-- índice parcial para listar vivos rápido
create index on plants (user_id) where deleted_at is null;
-- (repetir por tabla según consultas)
```

RLS: las políticas existentes por `user_id` siguen valiendo; no filtrar
`deleted_at` en el SELECT del pull (necesitamos recibir las filas borradas).

### 2. Modelo local

Añadir `deletedAt?: string` a `BaseItem` (en `packages/storage/src/store.ts`),
o solo a los modelos sincronizados. Adaptadores `*ToRow`/`rowTo*` mapean
`deleted_at <-> deletedAt`.

### 3. Borrado = update

- `removeFromCloud(table, ids)` deja de hacer `deleteRow`; pasa a
  `upsertAll(table, ids.map(id => ({ id, deleted_at: now })))`.
- Local: en vez de `store.remove`, marcar `deletedAt` (nuevo `store.softRemove`).
  Mantener la cola `pendingDeletes` para el caso offline (ahora encola un
  upsert de `deleted_at` en vez de un delete).

### 4. Lectura

- `useCollection.refresh` filtra `deletedAt == null` antes de exponer `items`.
  Así toda la UI ignora los borrados sin cambios en pantallas.
- `count` también filtra.

### 5. Sync

- `syncToCloud`: `upsertAll` ya sube `deleted_at` (es un campo más). Quitar el
  `flushPendingDeletes` basado en `deleteRow`.
- `syncFromCloud` / `mergeLocal`: sin cambios de lógica — un remote con
  `deleted_at` más reciente gana por `updatedAt` y marca el local como borrado.
  Ya no hace falta `getPendingDeleteIds` para filtrar el pull.
- Resultado: el borrado de B llega a A como una fila con `deleted_at`, A la
  marca borrada local, y deja de re-subirla "viva".

### 6. Purga (opcional, fase 2)

Job/cron que hace `DELETE` físico de filas con `deleted_at` > 90 días, tanto en
cloud como en local (al sincronizar, descartar tombstones antiguos). Evita que
la tabla crezca indefinidamente.

## Migración de datos existentes

- Filas actuales: `deleted_at = null` por defecto → siguen vivas. OK.
- App vieja (sin la columna) y app nueva conviviendo: la app vieja ignora
  `deleted_at` → seguiría resucitando. Por eso conviene forzar update mínimo de
  versión de app antes de activar, o aceptar ventana de inconsistencia.

## Esfuerzo estimado

- Migración SQL: 1 archivo.
- `store.ts` + `useCollection.ts`: `softRemove`, filtro de lectura, `deletedAt` en tipo.
- `adapters.ts`: mapear `deleted_at` en las 8 tablas.
- `pendingDeletes.ts` + `syncAll.ts`: simplificar (borrar = upsert).
- Handlers de borrado: sin cambios (siguen llamando `removeFromCloud` + soft remove local).
- Tests: añadir caso "borrado en B desaparece en A tras sync".

~Medio día. Riesgo medio (toca capa de datos). Hacer en rama propia con tests.

## Alternativa descartada

Server-side "last pulled at" + reconciliación por diff: más complejo, requiere
estado de sync por dispositivo. Soft-delete es más simple y estándar.
