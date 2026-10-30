import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';
import { Text } from './text';

export const CONTENT_MAX = 720;
export const DOCK_SPACE = 96;

/** Editorial page head: small back control on its own row, then a large left-aligned title. */
export function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.header}>
      {back && (
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={12}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}>
            <ArrowLeft size={18} color={c.text} strokeWidth={1.8} />
            <Text variant="label" tone="muted">
              Geri
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
        </View>
      )}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          {subtitle && (
            <Text variant="overline" tone="subtle" numberOfLines={1} style={{ marginBottom: 6 }}>
              {subtitle}
            </Text>
          )}
          <Text variant="display" numberOfLines={2}>
            {title}
          </Text>
        </View>
        {!back && right}
      </View>
    </View>
  );
}

export function Screen({
  children,
  title,
  subtitle,
  back,
  right,
  scroll = true,
  refreshing,
  onRefresh,
  footer,
  dock = false,
  contentStyle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  dock?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (dock ? DOCK_SPACE : 32) + insets.bottom;
  const header = title ? <Header title={title} subtitle={subtitle} back={back} right={right} /> : null;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.textMuted} /> : undefined}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1, paddingBottom: dock ? bottom : 0 }, contentStyle]}>
          {header}
          {children}
        </View>
      )}
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: c.background, borderTopColor: c.border }]}>
          <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>{footer}</View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
  header: { paddingTop: 8, paddingBottom: 6, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
