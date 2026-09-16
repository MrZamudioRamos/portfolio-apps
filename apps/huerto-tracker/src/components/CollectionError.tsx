import { Ionicons } from '@expo/vector-icons';
import { useColors, useTheme } from '@portfolio/ui';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

export function CollectionError({ onRetry }: { onRetry: () => void | Promise<unknown> }) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.error,
        borderRadius: radii.lg,
        backgroundColor: colors.error + '0d',
      }}
    >
      <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
          {t('errorScreen.title')}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19, marginTop: 2 }}>
          {t('errorScreen.desc')}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('errorScreen.retry')}
        onPress={() => { void onRetry(); }}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="refresh-outline" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}
