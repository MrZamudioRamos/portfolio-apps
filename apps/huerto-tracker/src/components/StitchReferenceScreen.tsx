import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@portfolio/ui';
import { StitchBottomNav } from './StitchBottomNav';
import { goBackOr } from '../utils/navigation';

export type StitchReferenceSection = {
  heading: string;
  body?: string;
  rows?: Array<{ title: string; detail?: string; icon?: keyof typeof Ionicons.glyphMap; tone?: 'normal' | 'success' | 'warning' | 'danger' }>;
};

export function StitchReferenceScreen({
  title,
  backLabel = 'Mi Huerto',
  eyebrow,
  intro,
  sections,
  primary,
  onPrimary,
  onBack,
  showBottomNav = false,
}: {
  title: string;
  backLabel?: string;
  eyebrow?: string;
  intro?: string;
  sections: StitchReferenceSection[];
  primary?: string;
  onPrimary?: () => void;
  onBack?: () => void;
  showBottomNav?: boolean;
}) {
  const colors = useColors();
  const router = useRouter();
  const goBack = onBack ?? (() => goBackOr(router));
  return <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <View style={[s.header, { borderBottomColor: colors.border }]}><Pressable onPress={goBack} accessibilityRole="button" style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[s.backText, { color: colors.text }]}>{backLabel}</Text></Pressable><Text style={[s.headerTitle, { color: colors.text }]}>{title}</Text><View style={{ width: 82 }} /></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {eyebrow && <Text style={[s.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>}
      {intro && <Text style={[s.intro, { color: colors.textSecondary }]}>{intro}</Text>}
      {sections.map((section) => <View key={section.heading} style={s.section}><Text style={[s.sectionHeading, { color: colors.textSecondary }]}>{section.heading}</Text>{section.body && <Text style={[s.body, { color: colors.textSecondary }]}>{section.body}</Text>}<View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{section.rows?.map((row, index) => { const tone = row.tone === 'danger' ? colors.error : row.tone === 'warning' ? colors.warning : row.tone === 'success' ? colors.primary : colors.text; return <Pressable key={`${section.heading}-${row.title}`} onPress={() => Alert.alert(row.title, row.detail ?? 'Semillita te ayudará con este paso.')} accessibilityRole="button" style={({ pressed }) => [s.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && { opacity: 0.72 }]}><Ionicons name={row.icon ?? 'leaf-outline'} size={19} color={row.tone === 'warning' ? colors.warning : colors.primary} /><View style={{ flex: 1 }}><Text style={[s.rowTitle, { color: tone }]}>{row.title}</Text>{row.detail && <Text style={[s.rowDetail, { color: colors.textSecondary }]}>{row.detail}</Text>}</View>{row.tone === 'success' ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : <Ionicons name="chevron-forward" size={17} color={colors.textDisabled} />}</Pressable>; })}</View></View>)}
      {primary && <Pressable onPress={onPrimary} style={[s.primary, { backgroundColor: colors.primary }]} accessibilityRole="button"><Text style={s.primaryText}>{primary}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></Pressable>}
    </ScrollView>{showBottomNav && <StitchBottomNav />}
  </SafeAreaView>;
}

const s = StyleSheet.create({ container: { flex: 1 }, header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18 }, back: { minHeight: 44, minWidth: 82, flexDirection: 'row', alignItems: 'center', gap: 2 }, backText: { fontSize: 14, fontWeight: '700' }, headerTitle: { fontSize: 18, fontWeight: '900' }, content: { paddingHorizontal: 18, paddingBottom: 110 }, eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 0.9, marginTop: 20 }, intro: { fontSize: 14, lineHeight: 21, marginTop: 8 }, section: { marginTop: 22 }, sectionHeading: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 }, body: { fontSize: 13, lineHeight: 20, marginBottom: 9 }, card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' }, row: { minHeight: 66, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, rowTitle: { fontSize: 14, fontWeight: '800' }, rowDetail: { fontSize: 12, lineHeight: 18, marginTop: 2 }, primary: { minHeight: 54, borderRadius: 14, marginTop: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, primaryText: { color: '#fff', fontWeight: '900' }, });
