import { useColors, useTheme, EmptyState } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type CustomCrop } from '../../src/models/custom-crop';
import { CATEGORY_CONFIG } from '../../src/data/crops';

export default function ManageCustomCropsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const collection = useCollection<CustomCrop>('custom_crops');

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>{t('customCrop.manage')}</Text>
        <Pressable
          onPress={() => router.push('/crop/new' as any)}
          hitSlop={12}
          style={s.addBtn}
        >
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={collection.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
        ListEmptyComponent={
          <EmptyState
            emoji="🌱"
            title={t('customCrop.empty')}
            description={t('customCrop.emptyDesc')}
            ctaLabel={t('customCrop.addNew')}
            onCta={() => router.push('/crop/new' as any)}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/crop/new?id=${item.id}` as any)}
            style={({ pressed }) => [
              s.row,
              {
                backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
                {CATEGORY_CONFIG[item.category]?.emoji} {t('cropCategory.' + item.category)} · {item.daysToHarvestMin}–{item.daysToHarvestMax}d
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, spacing: any, fontSize: any, fontWeight: any, radii: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.xs, marginRight: spacing.sm },
    addBtn: { padding: spacing.xs, marginLeft: 'auto' },
    title: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
  });
