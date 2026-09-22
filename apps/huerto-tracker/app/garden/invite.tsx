import { Ionicons } from '@expo/vector-icons';
import { acceptGardenViewerInvite, previewGardenViewerInvite, type GardenInvitePreview, signOut, useSession } from '@portfolio/supabase';
import { useColors, useTheme } from '@portfolio/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackOr } from '../../src/utils/navigation';

export default function GardenInviteScreen() {
  const colors = useColors();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { token: rawToken } = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const { user, loading: sessionLoading } = useSession();
  const [preview, setPreview] = useState<GardenInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    if (!token) {
      setPreview(null);
      setError('El enlace no contiene una invitación válida. Pide a quien comparte el huerto que genere otra.');
      setLoading(false);
      return () => { current = false; };
    }
    previewGardenViewerInvite(token)
      .then((value) => { if (current) setPreview(value); })
      .catch(() => { if (current) setError('No se pudo verificar el enlace. Comprueba tu conexión o pide una nueva invitación.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [token]);

  const matchingAccount = Boolean(user?.email && preview?.invited_email
    && user.email.trim().toLowerCase() === preview.invited_email.toLowerCase());

  async function accept() {
    if (!token || !preview || !user || !matchingAccount) return;
    if (!user.email_confirmed_at) {
      setError('Confirma primero tu correo y vuelve a abrir la invitación.');
      return;
    }
    setAccepting(true);
    setError('');
    try {
      const gardenId = await acceptGardenViewerInvite(token);
      router.replace(`/garden/shared/${gardenId}` as any);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      setError(code.includes('INVITE_EMAIL_MISMATCH')
        ? 'Esta invitación está ligada a otro correo.'
        : code.includes('INVITE_EXPIRED') || code.includes('INVITE_NOT_FOUND')
          ? 'La invitación caducó, se canceló o ya no existe. Pide un enlace nuevo.'
          : code.includes('VERIFIED_EMAIL_REQUIRED')
            ? 'Confirma tu correo antes de aceptar.'
            : 'No se pudo aceptar. Comprueba que la migración de compartir huertos esté aplicada y vuelve a intentarlo.');
    } finally {
      setAccepting(false);
    }
  }

  async function switchAccount() {
    try { await signOut(); router.replace('/auth' as any); }
    catch { setError('No se pudo cerrar la sesión actual. Inténtalo desde Ajustes y abre otra vez el enlace.'); }
  }

  const expired = preview ? new Date(preview.expires_at).getTime() <= Date.now() : false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOr(router, '/(tabs)')} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.primary} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Invitación a un huerto</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="leaf-outline" size={30} color={colors.primary} />
          {loading || sessionLoading ? <Text style={[styles.body, { color: colors.textSecondary }]}>Comprobando la invitación…</Text> : !preview ? <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Invitación no disponible</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{error || 'El enlace caducó o fue cancelado.'}</Text>
          </> : <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{preview.garden_name}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>Te han invitado a consultar este huerto en modo de solo lectura. No podrás editar ni borrar plantas o datos.</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>Invitación para {preview.invited_email} · caduca {formatDate(preview.expires_at)}</Text>
            {expired ? <Text style={[styles.feedback, { color: colors.error }]}>La invitación ya caducó.</Text> : !user ? <>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Inicia sesión con el correo invitado y vuelve a abrir este enlace para aceptarlo.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/auth' as any)} style={[styles.button, { backgroundColor: colors.primaryDark }]}><Text style={styles.buttonText}>Iniciar sesión</Text></Pressable>
            </> : !matchingAccount ? <>
              <Text style={[styles.feedback, { color: colors.warning }]}>Has iniciado sesión como {user.email ?? 'otra cuenta'}; esta invitación requiere {preview.invited_email}.</Text>
              <Pressable accessibilityRole="button" onPress={() => void switchAccount()} style={[styles.button, { backgroundColor: colors.primaryDark }]}><Text style={styles.buttonText}>Cambiar de cuenta</Text></Pressable>
            </> : <Pressable accessibilityRole="button" disabled={accepting} onPress={() => void accept()} style={[styles.button, { backgroundColor: colors.primaryDark, opacity: accepting ? 0.55 : 1 }]}><Text style={styles.buttonText}>{accepting ? 'Aceptando…' : 'Aceptar invitación'}</Text></Pressable>}
          </>}
          {error && preview && <Text accessibilityRole="alert" style={[styles.feedback, { color: colors.error }]}>{error}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  const { spacing, fontSize, fontWeight, radii } = theme;
  return StyleSheet.create({
    container: { flex: 1 }, header: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center' }, back: { width: 44, minHeight: 44, justifyContent: 'center' }, title: { flex: 1, textAlign: 'center', fontSize: fontSize.md, fontWeight: fontWeight.bold }, content: { padding: spacing.md, paddingTop: spacing.xl }, section: { alignItems: 'flex-start', borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md }, sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold }, body: { fontSize: fontSize.sm, lineHeight: 21 }, feedback: { fontSize: fontSize.sm, lineHeight: 21 }, button: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md }, buttonText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  });
}
