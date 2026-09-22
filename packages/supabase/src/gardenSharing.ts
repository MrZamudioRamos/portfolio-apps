import { getSupabase } from './client';

export interface GardenInvitePreview {
  garden_id: string;
  garden_name: string;
  invited_email: string;
  expires_at: string;
}

export interface GardenInvite {
  id: string;
  token: string;
  invited_email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
}

export interface SharedGardenSnapshot {
  garden: { id: string; name: string; province: string | null; climate_zone: string; grid_rows: number | null; grid_cols: number | null };
  plants: Array<{ id: string; crop_id: string; name: string; variety: string | null; status: string; bed_name: string | null }>;
  layout: { grid: unknown; free: unknown; mapPlan: unknown };
}

export function normalizeGardenInviteEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function uuidOrThrow(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('INVITE_INVALID');
  }
  return value;
}

export async function createGardenViewerInvite(gardenId: string, emailInput: string): Promise<{ id: string; token: string; expires_at: string }> {
  const email = normalizeGardenInviteEmail(emailInput);
  if (!email) throw new Error('INVITE_EMAIL_INVALID');
  const { data, error } = await getSupabase().rpc('create_garden_viewer_invite', {
    p_garden_id: uuidOrThrow(gardenId),
    p_email: email,
  });
  if (error) throw error;
  const invite = data as { id?: unknown; token?: unknown; expires_at?: unknown } | null;
  if (typeof invite?.id !== 'string' || typeof invite.token !== 'string' || typeof invite.expires_at !== 'string') {
    throw new Error('INVITE_RESPONSE_INVALID');
  }
  return { id: invite.id, token: uuidOrThrow(invite.token), expires_at: invite.expires_at };
}

export async function previewGardenViewerInvite(tokenInput: string): Promise<GardenInvitePreview | null> {
  const { data, error } = await getSupabase().rpc('preview_garden_viewer_invite', { p_token: uuidOrThrow(tokenInput) });
  if (error) throw error;
  if (!data || typeof data !== 'object') return null;
  const preview = data as Partial<GardenInvitePreview>;
  if (typeof preview.garden_id !== 'string' || typeof preview.garden_name !== 'string'
    || typeof preview.invited_email !== 'string' || typeof preview.expires_at !== 'string') return null;
  return preview as GardenInvitePreview;
}

export async function acceptGardenViewerInvite(tokenInput: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('accept_garden_viewer_invite', { p_token: uuidOrThrow(tokenInput) });
  if (error) throw error;
  const response = data as { garden_id?: unknown } | null;
  if (typeof response?.garden_id !== 'string') throw new Error('INVITE_RESPONSE_INVALID');
  return uuidOrThrow(response.garden_id);
}

export async function listGardenInvitations(gardenId: string): Promise<GardenInvite[]> {
  const { data, error } = await getSupabase().from('garden_invitations')
    .select('id,token,invited_email,created_at,expires_at,accepted_at,accepted_by')
    .eq('garden_id', uuidOrThrow(gardenId))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GardenInvite[];
}

export async function removeGardenViewer(gardenId: string, userId: string): Promise<void> {
  const { error } = await getSupabase().from('garden_members').delete()
    .eq('garden_id', uuidOrThrow(gardenId)).eq('user_id', uuidOrThrow(userId));
  if (error) throw error;
}

export async function revokeGardenViewerInvite(gardenId: string, inviteId: string): Promise<void> {
  const { error } = await getSupabase().from('garden_invitations').delete()
    .eq('garden_id', uuidOrThrow(gardenId)).eq('id', uuidOrThrow(inviteId));
  if (error) throw error;
}

export async function fetchSharedGarden(gardenId: string): Promise<SharedGardenSnapshot> {
  const id = uuidOrThrow(gardenId);
  const { data, error } = await getSupabase().rpc('get_shared_garden_snapshot', { p_garden_id: id });
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('SHARED_GARDEN_RESPONSE_INVALID');
  const snapshot = data as Partial<SharedGardenSnapshot>;
  if (!snapshot.garden || typeof snapshot.garden.id !== 'string' || !Array.isArray(snapshot.plants)) {
    throw new Error('SHARED_GARDEN_RESPONSE_INVALID');
  }
  return snapshot as SharedGardenSnapshot;
}

export async function listGardenViewers(gardenId: string): Promise<Array<{ user_id: string; joined_at: string }>> {
  const { data, error } = await getSupabase().from('garden_members').select('user_id,joined_at')
    .eq('garden_id', uuidOrThrow(gardenId)).order('joined_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{ user_id: string; joined_at: string }>;
}
