import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';
import { IconButton } from './button';
import { Text } from './text';

export const CONTENT_MAX = 720;
export const DOCK_SPACE = 110;

export function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      {back && <IconButton icon={ChevronLeft} accessibilityLabel="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      <View style={{ flex: 1, alignItems: back ? 'center' : 'flex-start' }}>
        <Text variant={back ? 'heading' : 'title'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {back ? <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View> : right}
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
  content: { paddingHorizontal: 18, gap: 14, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, paddingBottom: 4, minHeight: 56 },
  footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
