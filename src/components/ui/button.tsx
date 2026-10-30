import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { font, radius, useTheme } from '@/lib/theme';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'dark' | 'signal';
type Size = 'sm' | 'md' | 'lg';

export const haptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
};

function useVariant(variant: Variant) {
  const { c } = useTheme();
  return {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    dark: { bg: c.primary, fg: c.primaryText, border: c.primary },
    signal: { bg: c.signal, fg: '#FFFFFF', border: c.signal },
    secondary: { bg: c.surfaceMuted, fg: c.text, border: c.surfaceMuted },
    outline: { bg: 'transparent', fg: c.text, border: c.borderStrong },
    ghost: { bg: 'transparent', fg: c.text, border: 'transparent' },
    destructive: { bg: 'transparent', fg: c.danger, border: c.border },
  }[variant];
}

export function Button({
  title,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  onPress,
  ...props
}: Omit<PressableProps, 'style'> & {
  title?: string;
  icon?: LucideIcon;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const map = useVariant(variant);
  const h = { sm: 34, md: 46, lg: 52 }[size];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={(e) => {
        haptic();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        { height: h, paddingHorizontal: size === 'sm' ? 12 : 18, backgroundColor: map.bg, borderColor: map.border },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={map.fg} />
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 15 : 17} color={map.fg} strokeWidth={1.8} />}
          {title && (
            <Text variant="label" style={{ fontFamily: font.semibold, fontSize: size === 'sm' ? 13 : 15, letterSpacing: -0.1 }} color={map.fg}>
              {title}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  variant = 'outline',
  size = 40,
  color,
  style,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  variant?: Variant;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const map = useVariant(variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: radius.md, backgroundColor: map.bg, alignItems: 'center', justifyContent: 'center' },
        map.border !== 'transparent' && { borderWidth: 1, borderColor: map.border },
        pressed && { opacity: 0.65 },
        style,
      ]}>
      <View>
        <Icon size={Math.round(size * 0.44)} color={color ?? map.fg} strokeWidth={1.8} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
