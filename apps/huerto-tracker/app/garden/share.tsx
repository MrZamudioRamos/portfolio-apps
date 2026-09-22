import { Ionicons } from '@expo/vector-icons';
import { useColors, useTheme } from '@portfolio/ui';
import { useSession } from '@portfolio/supabase';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackOr } from '../../src/utils/navigation';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { usePro } from '../../src/hooks/usePro';
import { createGardenViewerInvite, listGardenInvitations, listGardenViewers, normalizeGardenInviteEmail, removeGardenViewer, revokeGardenViewerInvite, type GardenInvite } from '@portfolio/supabase';

export default function GardenShareScreen() {
  const colors = useColors();
  const theme = useTheme();
  const router = useRouter();
  const { activeGarden } = useActiveGarden();
  const { isPro } = usePro();
  const { user } = useSession();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [invitations, setInvitations] = useState<GardenInvite[]>([]);
  const [viewers, setViewers] = useState<Array<{ user_id: string; joined_at: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshAccess() {
    if (!activeGarden?.id || !user) return;
    setLoading(true);
    try {
      const [nextInvitations, nextViewers] = await Promise.all([
        listGardenInvitations(activeGarden.id),
        listGardenViewers(activeGarden.id),
      ]);
      setInvitations(nextInvitations);
      setViewers(nextViewers);
      setError('');
    } catch {
      setError('No se pudo cargar el acceso compartido. Comprueba la conexión y que la migración de Supabase esté aplicada.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshAccess(); }, [activeGarden?.id, user?.id]);

  async function shareInvite(invite: GardenInvite) {
    if (!activeGarden) return;
    const url = Linking.createURL('/garden/invite', { queryParams: { token: invite.token } });
    const expires = new Date(invite.expires_at).toLocaleDateString('es-ES');
    await Share.share({
      title: `Invitación a ${activeGarden.name}`,
      message: `Te invito a consultar el huerto «${activeGarden.name}» en Semilla. El acceso es de solo lectura y caduca el ${expires}: ${url}`,
      url,
    });
  }

  async function invite() {
    if (!activeGarden || !user) return;
    const normalized = normalizeGardenInviteEmail(email);
    if (!normalized) { setError('Escribe una dirección de correo válida.'); return; }
    if (normalized === user.email?.trim().toLowerCase()) { setError('Usa el correo de otra persona, no el de tu propia cuenta.'); return; }
    setBusyId('create');
    setError('');
    setNotice('');
    try {
      const created = await createGardenViewerInvite(activeGarden.id, normalized);
      const inviteRow: GardenInvite = { ...created, invited_email: normalized, created_at: new Date().toISOString(), accepted_at: null, accepted_by: null };
      setEmail('');
      await refreshAccess();
      try {
        await shareInvite(inviteRow);
        setNotice('Invitación creada. La otra persona debe abrirla con una cuenta verificada que use ese mismo correo.');
      } catch {
        setNotice('Invitación creada, pero no se pudo abrir la hoja de compartir. Usa el icono junto a la invitación pendiente para intentarlo de nuevo.');
      }
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      setError(code.includes('GARDEN_OWNER_REQUIRED')
        ? 'Solo quien creó este huerto puede gestionar sus invitaciones.'
        : code.includes('INVALID_EMAIL') || code === 'INVITE_EMAIL_INVALID'
          ? 'Escribe una dirección de correo válida.'
          : 'No se pudo crear la invitación. Revisa tu sesión y la conexión con Supabase.');
    } finally {
      setBusyId(null);
    }
  }

  function confirmRemoveViewer(userId: string) {
    Alert.alert('Retirar acceso', 'Esta cuenta dejará de ver el huerto compartido.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Retirar', style: 'destructive', onPress: () => void (async () => {
        if (!activeGarden) return;
        setBusyId(userId);
        try { await removeGardenViewer(activeGarden.id, userId); await refreshAccess(); }
        catch { setError('No se pudo retirar el acceso.'); }
        finally { setBusyId(null); }
      })() },
    ]);
  }

  function confirmRevokeInvite(inviteId: string) {
    Alert.alert('Cancelar invitación', 'El enlace dejará de funcionar.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar invitación', style: 'destructive', onPress: () => void (async () => {
        if (!activeGarden) return;
        setBusyId(inviteId);
        try { await revokeGardenViewerInvite(activeGarden.id, inviteId); await refreshAccess(); }
        catch { setError('No se pudo cancelar la invitación.'); }
        finally { setBusyId(null); }
      })() },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOr(router, '/garden/map-tools')} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Volver</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Compartir huerto</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!user ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Inicia sesión para compartir</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Las invitaciones quedan ligadas a tu cuenta y a un huerto que te pertenece.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/auth' as any)} style={[styles.button, { backgroundColor: colors.primaryDark }]}><Text style={styles.buttonText}>Iniciar sesión</Text></Pressable>
        </View> : !activeGarden ? <Text style={[styles.body, { color: colors.textSecondary }]}>Crea o selecciona un huerto antes de compartirlo.</Text> : !isPro ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Compartir huertos · Pro</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Invita a otra cuenta a consultar el plano y las plantas de {activeGarden.name}. El acceso será de solo lectura.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/paywall?source=garden_share' as any)} style={[styles.button, { backgroundColor: colors.primaryDark }]}><Text style={styles.buttonText}>Ver Semilla Pro</Text></Pressable>
        </View> : <>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeGarden.name}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>La persona invitada podrá consultar el huerto y su plano, pero no editar ni borrar información. La invitación dura 7 días, es de un solo uso y solo funciona con una cuenta verificada del correo indicado. Semilla no envía el correo: comparte el enlace desde la hoja del sistema.</Text>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Correo de la persona</Text>
            <TextInput accessibilityLabel="Correo de la persona invitada" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="nombre@ejemplo.com" placeholderTextColor={colors.textDisabled} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
            <Pressable accessibilityRole="button" disabled={busyId !== null || loading} onPress={() => void invite()} style={[styles.button, { backgroundColor: colors.primaryDark, opacity: busyId || loading ? 0.55 : 1 }]}><Text style={styles.buttonText}>{busyId === 'create' ? 'Creando…' : 'Crear y compartir invitación'}</Text></Pressable>
          </View>
          {error ? <Text accessibilityRole="alert" style={[styles.feedback, { color: colors.error }]}>{error}</Text> : null}
          {notice ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: colors.success }]}>{notice}</Text> : null}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}>Cuentas con acceso</Text><Pressable accessibilityRole="button" accessibilityLabel="Actualizar accesos" disabled={loading} onPress={() => void refreshAccess()} style={styles.iconButton}><Ionicons name="refresh-outline" size={18} color={colors.primary} /></Pressable></View>
            {viewers.length === 0 ? <Text style={[styles.body, { color: colors.textSecondary }]}>{loading ? 'Cargando…' : 'Todavía no hay cuentas invitadas.'}</Text> : viewers.map((viewer) => {
              const inviteRow = invitations.find((inviteItem) => inviteItem.accepted_by === viewer.user_id);
              return <View key={viewer.user_id} style={[styles.row, { borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{inviteRow?.invited_email ?? 'Cuenta invitada'}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>Solo lectura · desde {formatDate(viewer.joined_at)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Retirar acceso a ${inviteRow?.invited_email ?? 'la cuenta'}`} disabled={busyId !== null} onPress={() => confirmRemoveViewer(viewer.user_id)} style={styles.iconButton}><Ionicons name="person-remove-outline" size={19} color={colors.error} /></Pressable></View>;
            })}
          </View>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Invitaciones</Text>
            {invitations.length === 0 ? <Text style={[styles.body, { color: colors.textSecondary }]}>No hay invitaciones creadas.</Text> : invitations.map((inviteRow) => {
              const expired = new Date(inviteRow.expires_at).getTime() <= Date.now();
              const accepted = Boolean(inviteRow.accepted_at);
              return <View key={inviteRow.id} style={[styles.row, { borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{inviteRow.invited_email}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{accepted ? 'Aceptada' : expired ? 'Caducada' : `Pendiente · caduca ${formatDate(inviteRow.expires_at)}`}</Text></View>{!accepted && !expired && <Pressable accessibilityRole="button" accessibilityLabel={`Volver a compartir invitación a ${inviteRow.invited_email}`} disabled={busyId !== null} onPress={() => void shareInvite(inviteRow)} style={styles.iconButton}><Ionicons name="share-outline" size={19} color={colors.primary} /></Pressable>}{!accepted && <Pressable accessibilityRole="button" accessibilityLabel={`Cancelar invitación a ${inviteRow.invited_email}`} disabled={busyId !== null} onPress={() => confirmRevokeInvite(inviteRow.id)} style={styles.iconButton}><Ionicons name="close-circle-outline" size={20} color={colors.error} /></Pressable>}</View>;
            })}
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  const { spacing, fontSize, fontWeight, radii } = theme;
  return StyleSheet.create({
    container: { flex: 1 }, header: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center' }, back: { width: 76, minHeight: 44, flexDirection: 'row', alignItems: 'center' }, backText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, title: { flex: 1, textAlign: 'center', fontSize: fontSize.md, fontWeight: fontWeight.bold }, content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, section: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm }, sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, body: { fontSize: fontSize.sm, lineHeight: 20 }, fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: spacing.xs }, input: { minHeight: 48, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, fontSize: fontSize.sm }, button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md }, buttonText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold }, feedback: { fontSize: fontSize.sm, lineHeight: 20 }, sectionHeader: { flexDirection: 'row', alignItems: 'center' }, row: { minHeight: 56, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, rowTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  });
}
