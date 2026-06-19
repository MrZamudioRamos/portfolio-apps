import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useSession } from '@portfolio/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { usePro } from '../src/hooks/usePro';
import type { Plant } from '../src/models/plant';
import { type ChatMessage, sendChatMessage } from '../src/utils/aiChat';
import { useMemo } from 'react';

interface UIMessage extends ChatMessage {
  id: string;
  error?: boolean;
}

let msgCounter = 0;
// Timestamp prefix keeps ids unique across app restarts (history is persisted).
function uid() { return `${Date.now()}-${++msgCounter}`; }

const HISTORY_KEY = (gardenId: string) => `chat-history:${gardenId}`;
const MAX_HISTORY = 50;

export default function ChatScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isPro } = usePro();
  const { user } = useSession();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Restore persisted history for the active garden.
  useEffect(() => {
    if (!activeGarden?.id) return;
    setHydrated(false);
    AsyncStorage.getItem(HISTORY_KEY(activeGarden.id))
      .then((raw) => {
        if (raw) {
          try { setMessages(JSON.parse(raw)); } catch { /* corrupt — start fresh */ }
        } else {
          setMessages([]);
        }
      })
      .finally(() => setHydrated(true));
  }, [activeGarden?.id]);

  // Persist on every change (capped) — but never before hydration finishes,
  // or we'd overwrite saved history with the initial empty array.
  useEffect(() => {
    if (!hydrated || !activeGarden?.id) return;
    AsyncStorage.setItem(
      HISTORY_KEY(activeGarden.id),
      JSON.stringify(messages.slice(-MAX_HISTORY)),
    ).catch(() => {});
  }, [messages, hydrated, activeGarden?.id]);

  const clearChat = useCallback(() => {
    Alert.alert(t('chat.clearTitle'), t('chat.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => setMessages([]) },
    ]);
  }, [t]);

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  const gardenPlants = useMemo(
    () => plants.items.filter((p) => p.gardenId === activeGarden?.id),
    [plants.items, activeGarden?.id]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !activeGarden) return;
    setInput('');

    const userMsg: UIMessage = { id: uid(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await sendChatMessage(history, activeGarden, gardenPlants, i18n.language);
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply }]);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: code === 'AUTH' ? t('chat.errorAuth') : t('chat.error'), error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, loading, activeGarden, messages, gardenPlants, i18n.language, t]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('chat.title')}</Text>
          {activeGarden && (
            <Text style={[s.headerSub, { color: colors.textSecondary }]}>
              {t('chat.contextInfo', { province: activeGarden.province || t(`zone.${activeGarden.climateZone}`) })}
            </Text>
          )}
        </View>
        {messages.length > 0 && (
          <Pressable onPress={clearChat} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('chat.clearTitle')} style={{ marginRight: spacing.md }}>
            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        <View style={[s.aiBadge, { backgroundColor: colors.primary + '22' }]}>
          <Text style={[s.aiBadgeText, { color: colors.primary }]}>AI</Text>
        </View>
      </View>

      {/* PRO gate */}
      {!isPro ? (
        <View style={s.gate}>
          <Text style={{ fontSize: 56 }}>🤖</Text>
          <Text style={[s.gateTitle, { color: colors.text }]}>{t('chat.proTitle')}</Text>
          <Text style={[s.gateDesc, { color: colors.textSecondary }]}>{t('chat.proDesc')}</Text>
          <Pressable
            onPress={() => router.push('/paywall')}
            style={[s.gateBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[s.gateBtnText, { color: colors.background }]}>{t('chat.proBtn')}</Text>
          </Pressable>
        </View>
      ) : !user ? (
        /* Auth gate — the Edge Function requires a signed-in user */
        <View style={s.gate}>
          <Text style={{ fontSize: 56 }}>🔐</Text>
          <Text style={[s.gateTitle, { color: colors.text }]}>{t('chat.authTitle')}</Text>
          <Text style={[s.gateDesc, { color: colors.textSecondary }]}>{t('chat.authDesc')}</Text>
          <Pressable
            onPress={() => router.push('/auth' as any)}
            style={[s.gateBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[s.gateBtnText, { color: colors.background }]}>{t('chat.authBtn')}</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={{ fontSize: 48 }}>🌱</Text>
                <Text style={[s.emptyTitle, { color: colors.text }]}>{t('chat.emptyTitle')}</Text>
                <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('chat.emptyDesc')}</Text>
                <View style={s.suggestions}>
                  {[t('chat.suggest1'), t('chat.suggest2'), t('chat.suggest3')].map((s, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setInput(s)}
                      style={[styles.suggestChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    >
                      <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View style={[s.bubbleRow, isUser && s.bubbleRowUser]}>
                  {!isUser && (
                    <View style={[s.avatar, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={{ fontSize: 14 }}>🌱</Text>
                    </View>
                  )}
                  <View
                    style={[
                      s.bubble,
                      isUser
                        ? { backgroundColor: colors.primary, alignSelf: 'flex-end' }
                        : { backgroundColor: item.error ? colors.error + '18' : colors.surface, borderWidth: 1, borderColor: item.error ? colors.error + '44' : colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        s.bubbleText,
                        { color: isUser ? colors.background : item.error ? colors.error : colors.text },
                      ]}
                    >
                      {item.content}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {loading && (
            <View style={[s.loadingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.loadingText, { color: colors.textSecondary }]}>{t('chat.thinking')}</Text>
            </View>
          )}

          {/* Input bar */}
          <View style={[s.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[s.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textDisabled}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || loading}
              style={[
                s.sendBtn,
                { backgroundColor: input.trim() && !loading ? colors.primary : colors.border },
              ]}
            >
              <Ionicons name="send" size={18} color={colors.background} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// Static styles outside makeStyles for the suggestion chip (not theme-dependent structure)
const styles = StyleSheet.create({
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
});

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>,
) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    aiBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
    },
    aiBadgeText: { fontSize: 11, fontWeight: fontWeight.bold },
    gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
    gateTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
    gateDesc: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
    gateBtn: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radii.full,
      marginTop: spacing.sm,
    },
    gateBtnText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.md },
    messageList: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.lg },
    emptyWrap: { alignItems: 'center', paddingTop: 40, gap: spacing.sm },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
    emptyDesc: { fontSize: fontSize.sm, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
    suggestions: { gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    bubbleRowUser: { justifyContent: 'flex-end' },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    bubble: {
      maxWidth: '78%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.xl,
    },
    bubbleText: { fontSize: fontSize.sm, lineHeight: 22 },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    loadingText: { fontSize: fontSize.xs },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    input: {
      flex: 1,
      borderRadius: radii.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.sm,
      borderWidth: 1,
      maxHeight: 100,
      lineHeight: 20,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
