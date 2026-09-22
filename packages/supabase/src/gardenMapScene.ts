import { getSupabase } from './client';

export interface MapSceneSaveResult {
  status: 'saved' | 'conflict';
  revision: number;
  updatedAt: string;
  scene: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidOrThrow(value: string): string {
  if (!UUID_RE.test(value)) throw new Error('MAP_SCENE_GARDEN_ID_INVALID');
  return value;
}

function parseSaveResult(value: unknown): MapSceneSaveResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('MAP_SCENE_RESPONSE_INVALID');
  }
  const result = value as Record<string, unknown>;
  const status = result.status;
  const revision = result.revision;
  const updatedAt = result.updatedAt;
  if ((status !== 'saved' && status !== 'conflict')
    || typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0
    || typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt))) {
    throw new Error('MAP_SCENE_RESPONSE_INVALID');
  }
  return { status, revision, updatedAt, scene: result.scene ?? null };
}

/** Save a canonical scene through the owner-only, atomic revision-checked RPC. */
export async function saveGardenMapScene(
  gardenId: string,
  expectedRevision: number,
  scene: unknown,
): Promise<MapSceneSaveResult> {
  const id = uuidOrThrow(gardenId);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error('MAP_SCENE_REVISION_INVALID');
  }
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('MAP_SCENE_INVALID');
  }
  const { data, error } = await getSupabase().rpc('save_garden_map_scene', {
    p_garden_id: id,
    p_expected_revision: expectedRevision,
    p_scene: scene,
  });
  if (error) throw error;
  return parseSaveResult(data);
}
