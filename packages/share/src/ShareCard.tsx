import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ShareCardTheme {
  background: string;
  primaryColor: string;
  textColor: string;
  logoComponent?: React.ReactNode;
  appName: string;
  tagline?: string;
  handle: string;
}

export interface ShareCardProps {
  theme: ShareCardTheme;
  title: string;
  primaryStat: string;
  primaryStatLabel?: string;
  secondaryStat?: string;
  secondaryStatLabel?: string;
  badgeIcon?: string;
  /** 'stories' = 360×640, 'feed' = 360×360 */
  format?: 'stories' | 'feed';
}

export function ShareCard({
  theme,
  title,
  primaryStat,
  primaryStatLabel,
  secondaryStat,
  secondaryStatLabel,
  badgeIcon,
  format = 'feed',
}: ShareCardProps) {
  const height = format === 'stories' ? 640 : 360;

  return (
    <View style={[s.card, { width: 360, height, backgroundColor: theme.background }]}>
      {/* Top accent */}
      <View style={[s.accent, { backgroundColor: theme.primaryColor }]} />

      <View style={s.body}>
        {/* App identity */}
        <View style={s.identity}>
          {theme.logoComponent ?? null}
          <View style={{ flex: 1 }}>
            <Text style={[s.appName, { color: theme.textColor }]}>{theme.appName}</Text>
            {theme.tagline ? (
              <Text style={[s.tagline, { color: theme.textColor + 'AA' }]}>{theme.tagline}</Text>
            ) : null}
          </View>
        </View>

        {/* Primary stat block */}
        <View style={[s.statBlock, { backgroundColor: theme.primaryColor + '20', borderColor: theme.primaryColor + '44' }]}>
          {badgeIcon ? <Text style={s.badgeEmoji}>{badgeIcon}</Text> : null}
          <Text style={[s.statValue, { color: theme.primaryColor }]}>{primaryStat}</Text>
          {primaryStatLabel ? (
            <Text style={[s.statLabel, { color: theme.textColor + 'BB' }]}>{primaryStatLabel}</Text>
          ) : null}
        </View>

        {/* Title */}
        <Text style={[s.title, { color: theme.textColor }]}>{title}</Text>

        {/* Secondary stat */}
        {secondaryStat ? (
          <View style={s.secondaryRow}>
            <Text style={[s.secondaryVal, { color: theme.textColor + 'BB' }]}>{secondaryStat}</Text>
            {secondaryStatLabel ? (
              <Text style={[s.secondaryLbl, { color: theme.textColor + '77' }]}> {secondaryStatLabel}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Footer */}
      <View style={[s.footer, { borderTopColor: theme.primaryColor + '33' }]}>
        <Text style={[s.handle, { color: theme.textColor + '66' }]}>
          Hecho con {theme.appName} · {theme.handle}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden' },
  accent: { height: 5, width: '100%' },
  body: { flex: 1, paddingHorizontal: 28, paddingVertical: 20, justifyContent: 'center', gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  tagline: { fontSize: 11, marginTop: 1, letterSpacing: 0.2 },
  statBlock: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 6 },
  badgeEmoji: { fontSize: 40 },
  statValue: { fontSize: 52, fontWeight: '800', letterSpacing: -2, lineHeight: 56 },
  statLabel: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 28, letterSpacing: -0.3 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  secondaryVal: { fontSize: 16, fontWeight: '600' },
  secondaryLbl: { fontSize: 13 },
  footer: { paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  handle: { fontSize: 11, letterSpacing: 0.4 },
});
