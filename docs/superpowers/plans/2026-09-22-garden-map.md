# Plano de implementación: mapa unificado del huerto

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (inline) or `superpowers:subagent-driven-development` (delegated) to implement this plan task by task. Steps use checkbox syntax.

**Goal:** Unificar la organización espacial y la planificación de cultivos en un mismo plano persistente, migrando datos actuales sin pérdida y evitando conflictos de sincronización silenciosos.

**Architecture:** Mantener `garden_layouts` como la fila 1:1 por huerto. Añadir a esa fila una escena JSONB v2 y revisión CAS, conservando `layout` como puente para builds anteriores. En el cliente, una conversión versionada reúne cuadrícula, lienzo libre y herramientas en un modelo canónico; el mismo canvas sirve a los modos Organizar y Planificar. Los colaboradores siguen siendo solo lectores del snapshot saneado.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Expo Router, AsyncStorage, Supabase/Postgres/RLS, Vitest, i18next, `react-native-svg`/gestos ya instalados.

**Spec:** `docs/superpowers/specs/2026-09-22-garden-map-design.md`

## Global Constraints

- Mantener compatibilidad con Expo Go, accesibilidad táctil y las seis traducciones existentes.
- Toda cadena nueva pasa por `t()` y se incorpora a `ca`, `en`, `es`, `eu`, `gl` y `val`.
- No incorporar datos de ejemplo como si fueran del usuario.
- No añadir un proveedor de IA, nuevas cuotas, RevenueCat o nuevos niveles de pago.
- Los colaboradores mantienen rol `viewer`; el acceso se valida en Supabase, no solo en la UI.
- No eliminar ni vaciar los datos legacy durante la migración; conservar respaldo hasta confirmar la migración.

## Review Focus

1. **Payload legacy malformado o desconocido:** el mapa no debe convertirse silenciosamente en vacío; probar normalización, respaldo e idempotencia (Tasks 1–2).
2. **Huerto sin dimensiones o posiciones límite:** conservar coordenadas relativas y no mostrar medidas/compatibilidad como calculadas (Tasks 1 y 5).
3. **Build antiguo escribiendo `layout`:** no debe borrar `map_scene` v2, y un viewer no debe poder guardar ni leer la fila privada cruda (Task 3).
4. **Dos dispositivos offline con revisiones distintas:** conservar ambas versiones recuperables y no sobrescribir sin decisión explícita (Tasks 3–4).
5. **Objetos eliminados o cultivos sin fuente fiable:** pedir reasignación antes de borrar y presentar “dato desconocido” en vez de afirmar compatibilidad (Tasks 5–6).

---

### Task 1: Modelo espacial v2 y conversión pura de layouts legacy

**Files:**
- Modify: `apps/huerto-tracker/src/models/garden-map-plan.ts`
- Create: `apps/huerto-tracker/src/utils/gardenMapScene.ts`
- Create: `apps/huerto-tracker/src/utils/__tests__/gardenMapScene.test.ts`
- Modify: `apps/huerto-tracker/src/sync/__tests__/gardenMapPlan.test.ts`

**Interfaces:**
- `MapPlantPlacement = { plantId: string; x: number; y: number; structureId?: string }`.
- `GardenMapPlan` accepts versions `1 | 2`; v2 includes `plantPlacements`. Add `row` to `MapStructureKind`, plus optional `rotationDegrees` (0–359) and `rowSpacingCm` (positive, rows only). Preserve all current v1 fields and readers.
- `migrateLegacyMapScene(input: { plan: unknown; grid: GridLayout; rows: number; cols: number; free: FreeMapPositions; preferFree: boolean }): GardenMapPlan` returns a normalized v2 plan. Grid positions become cell centers; valid free positions remain unchanged; a duplicate plant ID uses the selected garden-type layout; existing structures, zones, and seasons survive.
- `normalizeGardenMapPlan` validates both versions without silently treating unknown data as valid v2.
- Test fixture used below: `legacyPlan = { version: 1, dimensions: { widthCm: 240, lengthCm: 180 }, structures: [{ id: 'bed-1', name: 'Bancal', kind: 'bed', x: 0.1, y: 0.2, widthCm: 100, lengthCm: 80 }], zones: [], plannedPlantings: [], seasons: [], seasonPlans: [] }`.

- [ ] **Step 1: Write failing migration and versioning tests**

```ts
it('converts grid cell centers and retains hand-placed free coordinates', () => {
  const result = migrateLegacyMapScene({
    plan: { ...legacyPlan, version: 1 },
    grid: ['grid-plant', null], rows: 1, cols: 2,
    free: { 'free-plant': { x: 0.75, y: 0.25 } }, preferFree: true,
  });
  expect(result.version).toBe(2);
  expect(result.plantPlacements).toEqual([
    { plantId: 'grid-plant', x: 0.25, y: 0.5 },
    { plantId: 'free-plant', x: 0.75, y: 0.25 },
  ]);
  expect(result.structures).toEqual(legacyPlan.structures);
});

it('prefers free coordinates for a balcony when the same plant appears in both layouts', () => {
  const result = migrateLegacyMapScene({
    plan: legacyPlan, grid: ['same-plant'], rows: 1, cols: 1,
    free: { 'same-plant': { x: 0.8, y: 0.3 } }, preferFree: true,
  });
  expect(result.plantPlacements.filter(({ plantId }) => plantId === 'same-plant'))
    .toEqual([{ plantId: 'same-plant', x: 0.8, y: 0.3 }]);
});
```

- [ ] **Step 2: Run the tests and confirm the missing migration API is the failure**

Run from `apps/huerto-tracker`: `npm run test -- src/utils/__tests__/gardenMapScene.test.ts src/sync/__tests__/gardenMapPlan.test.ts`

Expected: FAIL because `migrateLegacyMapScene`/v2 placement validation is not implemented, not because of a test import or syntax error.

- [ ] **Step 3: Implement the smallest compatible v2 model and pure converter**

Add the placement/type fields and strict v1/v2 normalization. In the converter, clamp nothing and invent no dimensions; reject invalid coordinates from the active placement list so Task 2 can retain their original raw payload in the backup. Use an ID set so a plant appears at most once.

- [ ] **Step 4: Run the focused tests and typecheck**

Run: `npm run test -- src/utils/__tests__/gardenMapScene.test.ts src/sync/__tests__/gardenMapPlan.test.ts`, then `npm run typecheck`.

Expected: migration and legacy adapter tests pass; TypeScript exits 0.

- [ ] **Step 5: Commit the model boundary**

```bash
git add apps/huerto-tracker/src/models/garden-map-plan.ts apps/huerto-tracker/src/utils/gardenMapScene.ts apps/huerto-tracker/src/utils/__tests__/gardenMapScene.test.ts apps/huerto-tracker/src/sync/__tests__/gardenMapPlan.test.ts
git commit -m "feat(huerto): add versioned garden map scene"
```

---

### Task 2: Offline storage and recoverable local migration

**Files:**
- Modify: `apps/huerto-tracker/src/hooks/useGardenMapPlan.ts`
- Modify: `apps/huerto-tracker/src/hooks/useGardenLayout.ts` (export the existing per-garden layout key; keep old hook behavior)
- Modify: `apps/huerto-tracker/src/hooks/useGardenFreeLayout.ts` (reuse/export existing storage keys only)
- Create: `apps/huerto-tracker/src/utils/gardenMapSceneStorage.ts`
- Create: `apps/huerto-tracker/src/utils/__tests__/gardenMapSceneStorage.test.ts`

**Interfaces:**
- `gardenMapSceneKey(gardenId: string)` and `gardenMapSceneBackupKey(gardenId: string)` identify the v2 scene and retained raw backup.
- `loadOrMigrateGardenMapScene(gardenId, gardenType, storage)` reads v2 first; otherwise backs up legacy plan/grid/free values before writing v2. A repeat call returns the same scene and never repeats or loses placements.
- `useGardenMapPlan(gardenId, gardenType?)` remains the screen-facing hook and exposes loading/error/write behavior for the v2 scene.
- `storage` implements only `getItem(key)`, `setItem(key, value)`, and `multiSet([[key, value], ...])`; the test memory store keeps these values in a `Map<string, string>` and can reject one configured write key.

- [ ] **Step 1: Write failing storage migration tests**

```ts
it('backs up raw legacy values before writing a v2 scene and is idempotent', async () => {
  const storage = createMemoryStorage({
    [gardenLayoutKey(gardenId)]: JSON.stringify(['plant-1', null]),
    [freeLayoutKey(gardenId)]: JSON.stringify({}),
    [gardenMapPlanKey(gardenId)]: JSON.stringify(legacyPlan),
  });
  const first = await loadOrMigrateGardenMapScene(gardenId, 'huerto', storage);
  const second = await loadOrMigrateGardenMapScene(gardenId, 'huerto', storage);
  expect(first).toEqual(second);
  expect(await storage.getItem(gardenMapSceneBackupKey(gardenId))).toContain('plant-1');
  expect(first.plantPlacements).toHaveLength(1);
});

it('keeps the legacy values intact when writing the new scene fails', async () => {
  const storage = createFailingMemoryStorage({ [gardenLayoutKey(gardenId)]: '["plant-1"]' });
  await expect(loadOrMigrateGardenMapScene(gardenId, 'huerto', storage)).rejects.toThrow();
  expect(await storage.getItem(gardenLayoutKey(gardenId))).toBe('["plant-1"]');
});
```

- [ ] **Step 2: Run tests and confirm they fail on the absent storage migration**

Run: `npm run test -- src/utils/__tests__/gardenMapSceneStorage.test.ts`

Expected: FAIL because `loadOrMigrateGardenMapScene` is not yet implemented.

- [ ] **Step 3: Implement backup-first, idempotent storage migration**

Use the injected storage interface for deterministic tests. Keep raw legacy keys and backup; only write a migration marker after validating the new v2 scene. If any write fails, surface an error and leave legacy values readable. Update the hook call sites to pass garden type so balconies/macetas prefer free positions.

- [ ] **Step 4: Run storage, map, and hook-focused tests**

Run: `npm run test -- src/utils/__tests__/gardenMapSceneStorage.test.ts src/utils/__tests__/gardenMapScene.test.ts src/sync/__tests__/gardenMapPlan.test.ts`, then `npm run typecheck`.

Expected: all focused tests pass; legacy map keys remain unchanged after migration.

- [ ] **Step 5: Commit the offline migration layer**

```bash
git add apps/huerto-tracker/src/hooks/useGardenMapPlan.ts apps/huerto-tracker/src/hooks/useGardenLayout.ts apps/huerto-tracker/src/hooks/useGardenFreeLayout.ts apps/huerto-tracker/src/utils/gardenMapSceneStorage.ts apps/huerto-tracker/src/utils/__tests__/gardenMapSceneStorage.test.ts
git commit -m "feat(huerto): migrate map scenes without data loss"
```

---

### Task 3: Versioned Supabase scene writes and safe shared snapshots

**Files:**
- Create: `packages/supabase/migrations/023_garden_map_scene.sql`
- Create: `supabase/migrations/202609220006_garden_map_scene.sql` (same SQL as the package migration)
- Create: `packages/supabase/src/gardenMapScene.ts`
- Modify: `packages/supabase/src/gardenSharing.ts`
- Modify: `packages/supabase/src/types.ts` and `packages/supabase/src/index.ts`
- Create: `supabase/tests/garden_map_scene.test.sql`

**Interfaces:**
- Add nullable `garden_layouts.map_scene jsonb`, `map_scene_revision bigint not null default 0`, and `map_scene_updated_at timestamptz`. The old `layout` column remains the compatibility bridge.
- `saveGardenMapScene(gardenId, expectedRevision, scene): Promise<MapSceneSaveResult>` calls an atomic compare-and-swap RPC. The shared Supabase package returns a validated envelope with `scene: unknown`; the app layer validates it through `normalizeGardenMapPlan`, avoiding a package dependency on app models.
- `MapSceneSaveResult = { status: 'saved' | 'conflict'; revision: number; updatedAt: string; scene: unknown }`.
- Owners may save; viewers do not get direct raw-table access. `get_shared_garden_snapshot` returns the required scene geometry/placements with notes and photo URIs removed.
- SQL test transaction uses pgTAP `plan()/finish()`, `has_column`, `has_function`, and `has_function_privilege`; auth-claim cases seed owner/viewer gardens inside a rollback transaction and assert owner success, stale-revision conflict, and viewer denial.

- [ ] **Step 1: Add failing database-contract tests**

Create pgTAP assertions for the three columns, the authenticated-only RPC grant, and RPC existence; add owner-save, stale-revision conflict, and viewer-denial cases using test auth claims. Run `supabase test db` and confirm the missing-column/function assertions fail on the current schema.

- [ ] **Step 2: Write the additive, retry-safe migration and RPC**

The RPC must verify `auth.uid()` owns `p_garden_id`, compare `p_expected_revision` inside the same SQL write, increment revision exactly once on success, and return the current scene/revision on conflict. It must not grant viewer write access or drop/change legacy columns. Update the shared snapshot RPC in this new migration, preserving the current private-field exclusions.

- [ ] **Step 3: Implement the typed client wrapper and snapshot shape**

Validate UUID, non-negative integer revision, returned status, scene JSON, and timestamp before exposing a result to the app. Export only the new public API and types; do not add a service-role path to the client.

- [ ] **Step 4: Run database and package checks**

Run: `supabase test db`; verify the two migration copies are byte-identical with `Get-FileHash`; run app `npm run typecheck`.

Expected: pgTAP owner save succeeds, stale save returns conflict, viewer save is rejected, snapshot excludes private notes/photos; typecheck exits 0.

- [ ] **Step 5: Commit the backend boundary**

```bash
git add packages/supabase/migrations/023_garden_map_scene.sql supabase/migrations/202609220006_garden_map_scene.sql packages/supabase/src/gardenMapScene.ts packages/supabase/src/gardenSharing.ts packages/supabase/src/types.ts packages/supabase/src/index.ts supabase/tests/garden_map_scene.test.sql
git commit -m "feat(supabase): persist garden scenes with revision checks"
```

---

### Task 4: Offline sync, revision conflicts, and recovery choice

**Files:**
- Create: `apps/huerto-tracker/src/sync/gardenMapSceneSync.ts`
- Create: `apps/huerto-tracker/src/sync/__tests__/gardenMapSceneSync.test.ts`
- Modify: `apps/huerto-tracker/src/sync/syncAll.ts`
- Modify: `apps/huerto-tracker/src/sync/adapters.ts`
- Modify: `apps/huerto-tracker/src/sync/__tests__/syncAll.test.ts`
- Modify: `apps/huerto-tracker/src/hooks/useGardenMapPlan.ts`

**Interfaces:**
- `decideMapSceneSync({ localRevision, remoteRevision, localDirty }): 'push' | 'pull' | 'conflict' | 'noop'` is a pure resolver.
- A successful RPC updates the local acknowledged revision/timestamp. A stale RPC stores both local and remote scenes in a conflict record; neither side is discarded until the user chooses.
- `syncToCloud` continues syncing legacy `layout` for compatibility, but never includes `map_scene` in generic upsert. It pushes the canonical scene only through `saveGardenMapScene`.
- `syncFromCloud` writes newer remote scenes only if local has no unsynced edits; otherwise it records a conflict.

- [ ] **Step 1: Write failing resolver and sync preservation tests**

```ts
it('reports conflict instead of overwriting a dirty local scene at an older revision', () => {
  expect(decideMapSceneSync({ localRevision: 3, remoteRevision: 4, localDirty: true }))
    .toBe('conflict');
});

it('pulls a newer remote scene when the local scene is clean', () => {
  expect(decideMapSceneSync({ localRevision: 3, remoteRevision: 4, localDirty: false }))
    .toBe('pull');
});
```

- [ ] **Step 2: Run the tests and verify the resolver is absent**

Run: `npm run test -- src/sync/__tests__/gardenMapSceneSync.test.ts src/sync/__tests__/syncAll.test.ts`

Expected: FAIL because `decideMapSceneSync` and scene-specific sync do not exist.

- [ ] **Step 3: Implement CAS sync and recoverable conflict state**

Do not send `map_scene` through `upsertAll`. Persist local changes before any request; on network failure leave them dirty. On conflict, keep the local scene and remote response in separate storage keys. Expose explicit “usar la versión sincronizada” and “conservar mi versión” actions; the latter retries against the newly observed revision and can conflict again.

- [ ] **Step 4: Run sync tests and existing whole app suite**

Run: `npm run test -- src/sync/__tests__/gardenMapSceneSync.test.ts src/sync/__tests__/syncAll.test.ts`, then `npm run test` and `npm run typecheck`.

Expected: stale edits remain recoverable, remote clean updates pull, legacy sync tests still pass, full app tests/typecheck exit 0.

- [ ] **Step 5: Commit sync behavior**

```bash
git add apps/huerto-tracker/src/sync/gardenMapSceneSync.ts apps/huerto-tracker/src/sync/__tests__/gardenMapSceneSync.test.ts apps/huerto-tracker/src/sync/syncAll.ts apps/huerto-tracker/src/sync/adapters.ts apps/huerto-tracker/src/sync/__tests__/syncAll.test.ts apps/huerto-tracker/src/hooks/useGardenMapPlan.ts
git commit -m "feat(huerto): protect offline map edits from conflicts"
```

---

### Task 5: Shared canvas and Organizar mode

**Files:**
- Create: `apps/huerto-tracker/src/utils/gardenMapGeometry.ts`
- Create: `apps/huerto-tracker/src/utils/__tests__/gardenMapGeometry.test.ts`
- Create: `apps/huerto-tracker/src/components/garden-map/GardenMapCanvas.tsx`
- Modify: `apps/huerto-tracker/app/garden/map.tsx`
- Modify: `apps/huerto-tracker/app/garden/map-tools.tsx`
- Modify: all six `apps/huerto-tracker/src/i18n/locales/*.json`

**Interfaces:**
- `moveMapStructure(structure, normalizedPoint, dimensions?)` preserves physical size and clamps the rotated bounding box to known bounds; without dimensions it preserves relative placement and does not display scale.
- `GardenMapCanvas` receives the v2 scene, `mode: 'organize' | 'plan'`, plants, selection, and move callbacks. It renders structures, zones, and plant markers from the same scene; it does not own persistence.
- `/garden/map` is the canonical entry. `/garden/map-tools` remains a compatible advanced-tools route over the same hook/scene, not a second map model.
- `moveMapStructure` accepts a `MapStructure`, `{ x: number; y: number }`, and optional `MapDimensions`, and returns a `MapStructure`; a rectangle at 0° with 80×60 cm in a 100×100 cm plot cannot end beyond `x=0.2, y=0.4`.

- [ ] **Step 1: Write failing geometry tests**

```ts
it('keeps a moved rectangular structure inside the measured garden bounds', () => {
  const result = moveMapStructure(
    { id: 'bed', x: 0.8, y: 0.8, widthCm: 80, lengthCm: 60, rotationDegrees: 0 },
    { x: 1, y: 1 },
    { widthCm: 100, lengthCm: 100 },
  );
  expect(result.x).toBeLessThanOrEqual(0.2);
  expect(result.y).toBeLessThanOrEqual(0.4);
});
```

- [ ] **Step 2: Run the geometry test and confirm it fails for the missing helper**

Run: `npm run test -- src/utils/__tests__/gardenMapGeometry.test.ts`

Expected: FAIL because `moveMapStructure` is not defined.

- [ ] **Step 3: Add the geometry helper and extract/reuse the current map canvas**

Support object rotation and linear rows with editable spacing. Reuse installed Expo-compatible gestures and current `DraggableMarker`; do not add native dependencies. Add Organizar mode with add/place/move/rotate/edit-by-number controls, optional grid snap, light/water overlays, and an accessible list alternative. If a structure has crop placements, require reassignment or explicit unplacement before deletion.

- [ ] **Step 4: Run canvas-adjacent tests and verify translations**

Run: `npm run test -- src/utils/__tests__/gardenMapGeometry.test.ts src/utils/__tests__/gardenMapScene.test.ts`, `npm run typecheck`, then verify every newly used i18n key exists in `ca`, `en`, `es`, `eu`, `gl`, and `val`.

Expected: geometry tests pass; no missing translation keys or TypeScript errors.

- [ ] **Step 5: Commit the organize mode**

```bash
git add apps/huerto-tracker/src/utils/gardenMapGeometry.ts apps/huerto-tracker/src/utils/__tests__/gardenMapGeometry.test.ts apps/huerto-tracker/src/components/garden-map/GardenMapCanvas.tsx apps/huerto-tracker/app/garden/map.tsx apps/huerto-tracker/app/garden/map-tools.tsx apps/huerto-tracker/src/i18n/locales
git commit -m "feat(huerto): organize garden structures on one canvas"
```

---

### Task 6: Planificar mode, explainable checks, and shared read view

**Files:**
- Modify: `apps/huerto-tracker/app/garden/map.tsx`
- Modify: `apps/huerto-tracker/app/garden/map-tools.tsx`
- Modify: `apps/huerto-tracker/app/garden/shared/[gardenId].tsx`
- Modify: `apps/huerto-tracker/src/utils/gardenMapPlanner.ts`
- Modify: `apps/huerto-tracker/src/utils/__tests__/gardenMapPlanner.test.ts`
- Modify: `packages/supabase/src/gardenSharing.ts` to expose the safe scene projection
- Modify: all six i18n locale files for final missing strings

**Interfaces:**
- Planning places existing plants by `plantId` and planned crops by crop ID on the same canvas; placements can reference a structure ID and remain distinct from archived season snapshots.
- Reuse `findSpacingWarnings`, `findMapCropAssociations`, `getSeasonRotationWarnings`, and crop catalog facts. Missing dimensions/catalog/light data produce an explicit unknown state, never a green “compatible” claim.
- Shared viewers see the sanitized v2 map in read-only mode; owner-only editing, current Pro gates, materials, season archive, export, and sharing remain intact.
- `getMapSpacingStatus(plants, dimensions?)` returns `{ status: 'known'; warnings: SpacingWarning[] }` or `{ status: 'unknown'; reason: 'dimensions' | 'crop-spacing' }`. `placePlantOnMap(scene, plantId, point, structureId?)` returns a new v2 scene and does not mutate plant lifecycle records or archived snapshots.

- [ ] **Step 1: Write failing placement and unknown-data tests**

```ts
it('does not report spacing as compatible when dimensions are unknown', () => {
  expect(getMapSpacingStatus([{ id: 'plant-1', spacingCm: 30, x: 0.5, y: 0.5 }], undefined))
    .toEqual({ status: 'unknown', reason: 'dimensions' });
});

it('reports a placement on the selected structure without changing the live plant record', () => {
  const scene: GardenMapPlan = { version: 2, structures: [{ id: 'bed-1', name: 'Bancal', kind: 'bed', x: 0, y: 0, widthCm: 100, lengthCm: 80 }], zones: [], plantPlacements: [], plannedPlantings: [], seasons: [], seasonPlans: [] };
  const next = placePlantOnMap(scene, 'plant-1', { x: 0.3, y: 0.4 }, 'bed-1');
  expect(next.plantPlacements).toContainEqual({ plantId: 'plant-1', x: 0.3, y: 0.4, structureId: 'bed-1' });
  expect(next.seasons).toEqual(scene.seasons);
});
```

- [ ] **Step 2: Run focused tests and confirm missing Plan mode behavior**

Run: `npm run test -- src/utils/__tests__/gardenMapPlanner.test.ts`

Expected: FAIL because the explicit readiness/placement behavior is absent.

- [ ] **Step 3: Implement Plan mode and preserve existing planner tools**

Add the Organizar/Planificar selector and mode-specific actions on the shared canvas. A tap/accessible list action places or moves a plant; selected plant details can open without losing the current scene. Show known spacing, compatibility, rotation, light, and irrigation warnings with their input/source; show “faltan medidas/datos” where unknown. Reuse existing season/material/share calculations, and keep new map edits separate from actual crop lifecycle dates.

- [ ] **Step 4: Update safe viewer rendering and run full verification**

Run: `npm run test -- src/utils/__tests__/gardenMapPlanner.test.ts src/sync/__tests__/gardenMapPlan.test.ts`, then `npm run test`, `npm run typecheck`, and `npm run build -- --platform all` from `apps/huerto-tracker`; run `supabase test db` from repo root.

Expected: all app tests pass, typecheck and Expo export exit 0, SQL permissions/snapshot tests pass; viewer UI is read-only and omits notes/photos.

- [ ] **Step 5: Commit Plan mode and final integration**

```bash
git add apps/huerto-tracker/app/garden/map.tsx apps/huerto-tracker/app/garden/map-tools.tsx "apps/huerto-tracker/app/garden/shared/[gardenId].tsx" apps/huerto-tracker/src/utils/gardenMapPlanner.ts apps/huerto-tracker/src/utils/__tests__/gardenMapPlanner.test.ts apps/huerto-tracker/src/i18n/locales packages/supabase/src/gardenSharing.ts
git commit -m "feat(huerto): plan crops on the shared garden map"
```

## Plan Self-Review

- **Spec coverage:** physical layout/rows and measured bounds (Tasks 1, 5); shared Organizar/Planificar scene (Tasks 1, 5–6); explainable crop checks (Task 6); offline migration/backups (Task 2); Supabase CAS, RLS and sanitized viewer snapshot (Tasks 3–4); accessibility/i18n/Expo Go (Tasks 5–6); compatibility via legacy `layout` bridge (Tasks 3–4).
- **Failure inputs:** malformed v1 payload and duplicate IDs (Task 1); storage write failure/no dimensions (Tasks 1–2); viewer/unauthenticated/stale revision (Tasks 3–4); repeated offline edits (Task 4); unknown catalog facts and deletion of occupied structures (Tasks 5–6).
- **Interface order:** Task 1 defines v2 scene and migration; Task 2 persists it; Task 3 stores the same typed scene and returns revisions; Task 4 consumes the save result; Tasks 5–6 consume only the v2 hook and canvas props. No task invents a parallel scene type.
- **Scope:** no new dependency, AI provider, polygon drawing, live collaboration, or payment gate; reuses the existing map planner, garden layout row, share RPC, local cache and Expo-compatible gestures.
