export { initSupabase, getSupabase } from './client';
export { pullAll, upsertAll, deleteRow, deleteAllForUser } from './sync';
export { useSession } from './useSession';
export type { SessionState } from './useSession';
export { signInWithGoogle, signInWithApple, signInWithMagicLink, verifyOtp, signInWithPassword, signOut, handleDeepLink } from './auth';
export type { Profile, RemoteCrop, RemoteClimateZone, RemoteProvinceZone, RemoteGarden, RemotePlant, RemoteDiaryEntry, RemoteReminder, Database, ClimateZone, CropCategory, UserTier, PlantStatus } from './types';
