export { initSupabase, getSupabase, isSupabaseConfigured } from './client';
export { pullAll, upsertAll, deleteRow, deleteAllForUser } from './sync';
export { pullCropCatalog } from './catalog';
export { acceptGardenViewerInvite, createGardenViewerInvite, fetchSharedGarden, listGardenInvitations, listGardenViewers, normalizeGardenInviteEmail, previewGardenViewerInvite, removeGardenViewer, revokeGardenViewerInvite } from './gardenSharing';
export type { GardenInvite, GardenInvitePreview, SharedGardenSnapshot } from './gardenSharing';
export { useSession } from './useSession';
export type { SessionState } from './useSession';
export { signInWithGoogle, signInWithApple, signInWithMagicLink, verifyOtp, signInWithPassword, signOut, deleteAccount, handleDeepLink } from './auth';
export type { Profile, RemoteCrop, RemoteClimateZone, RemoteProvinceZone, RemoteGarden, RemotePlant, RemoteDiaryEntry, RemoteReminder, RemoteSeedLot, Database, ClimateZone, CropCategory, UserTier, PlantStatus } from './types';
