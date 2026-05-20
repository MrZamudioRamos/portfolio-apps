import { useColors, useTheme } from '@portfolio/ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CropInfo } from '../../data/crops';
import { getCropFaq, type FaqItem } from '../../utils/cropFaq';

interface Props {
  crop: CropInfo;
  cropName: string;
}

export function CropFaq({ crop, cropName }: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t, i18n } = useTranslation();

  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<'noKey' | 'generic' | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const faq = await getCropFaq(crop, cropName, i18n.language);
      setItems(faq);
    } catch (err: unknown) {
      const e = err as { code?: string };
      setErrorKey(e.code === 'NO_KEY' ? 'noKey' : 'generic');
    } finally {
      setLoading(false);
    }
  }, [crop, cropName, i18n.language]);

  useEffect(() => { load(); }, [load]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>{t('plantFaq.loading')}</Text>
      </View>
    );
  }

  if (errorKey) {
    return (
      <View style={[s.errorBox, { backgroundColor: colors.error + '12', borderColor: colors.error }]}>
        <Text style={[s.errorTitle, { color: colors.error }]}>{t('plantFaq.error')}</Text>
        <Text style={[s.errorDesc, { color: colors.textSecondary }]}>
          {t(errorKey === 'noKey' ? 'plantFaq.noKeyDesc' : 'plantFaq.errorDesc')}
        </Text>
        <Pressable onPress={load} style={[s.retryBtn, { borderColor: colors.error }]}>
          <Text style={[s.retryText, { color: colors.error }]}>{t('plantFaq.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {items.map((item, i) => {
        const open = expanded === i;
        return (
          <Pressable
            key={i}
            onPress={() => setExpanded(open ? null : i)}
            style={[
              s.item,
              {
                backgroundColor: open ? colors.primary + '08' : colors.surface,
                borderColor: open ? colors.primary + '44' : colors.border,
              },
            ]}
          >
            <View style={s.questionRow}>
              <Text style={[s.qNumber, { color: colors.primary }]}>{i + 1}</Text>
              <Text style={[s.question, { color: colors.text }]} numberOfLines={open ? undefined : 2}>
                {item.q}
              </Text>
              <Text style={[s.chevron, { color: colors.textDisabled }]}>{open ? '▲' : '▼'}</Text>
            </View>
            {open && (
              <Text style={[s.answer, { color: colors.textSecondary, borderTopColor: colors.border }]}>
                {item.a}
              </Text>
            )}
          </Pressable>
        );
      })}
      <Text style={[s.footer, { color: colors.textDisabled }]}>{t('plantFaq.aiNote')}</Text>
    </View>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Record<string, any>,
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { paddingBottom: spacing.xl },
    center: { alignItems: 'center', paddingVertical: spacing.xl * 3, gap: spacing.lg },
    loadingText: { fontSize: fontSize.sm },
    errorBox: {
      margin: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    errorTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    errorDesc: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
    retryBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    retryText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    item: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    questionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: spacing.md,
      gap: spacing.sm,
    },
    qNumber: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      width: 18,
      paddingTop: 2,
    },
    question: {
      flex: 1,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: 20,
    },
    chevron: { fontSize: 10, paddingTop: 4 },
    answer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      paddingLeft: spacing.md + 18 + spacing.sm,
      fontSize: fontSize.sm,
      lineHeight: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    footer: {
      textAlign: 'center',
      fontSize: fontSize.xs,
      marginTop: spacing.md,
      paddingHorizontal: spacing.xl,
    },
  });
