import { useColors, useTheme } from '@portfolio/ui';
import { ShareCard, useShareCard, type ShareCardTheme } from '@portfolio/share';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const HUERTO_THEME: ShareCardTheme = {
  background: '#1A2E1A',
  primaryColor: '#66BB6A',
  textColor: '#F1F8E9',
  logoComponent: <Text style={{ fontSize: 28 }}>🌱</Text>,
  appName: 'HuertoTracker',
  tagline: 'Tu huerto urbano',
  handle: 'huertotracker.app',
};

export interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  primaryStat: string;
  primaryStatLabel?: string;
  secondaryStat?: string;
  secondaryStatLabel?: string;
  badgeIcon?: string;
  eventType: string;
}

export function ShareModal({
  visible,
  onClose,
  title,
  primaryStat,
  primaryStatLabel,
  secondaryStat,
  secondaryStatLabel,
  badgeIcon,
  eventType,
}: ShareModalProps) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();

  const { cardRef, share } = useShareCard({
    app: 'huerto-tracker',
    eventType,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  });

  const cardProps = {
    theme: HUERTO_THEME,
    title,
    primaryStat,
    primaryStatLabel,
    secondaryStat,
    secondaryStatLabel,
    badgeIcon,
    format: 'feed' as const,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          {/* Drag handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Card preview (this is also the capture target) */}
          <View ref={cardRef} collapsable={false} style={s.cardContainer}>
            <ShareCard {...cardProps} />
          </View>

          <View style={[s.actions, { gap: spacing.md }]}>
            <Pressable
              onPress={async () => { await share(); onClose(); }}
              style={[s.shareBtn, { backgroundColor: colors.primary, borderRadius: radii.full }]}
            >
              <Text style={[s.shareBtnText, { fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
                Compartir
              </Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[s.skipText, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
                Ahora no
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  cardContainer: {
    width: 300,
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    // Scale 360×360 ShareCard down to 300×300 display
    transform: [{ scale: 300 / 360 }],
  },
  actions: { width: '100%', alignItems: 'center' },
  shareBtn: { width: '100%', paddingVertical: 16, alignItems: 'center' },
  shareBtnText: { color: '#fff' },
  skipText: {},
});
