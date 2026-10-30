import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { font, radius, useTheme } from '@/lib/theme';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'dark';
type Size = 'sm' | 'md' | 'lg';

export const haptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
};

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
  const { c } = useTheme();
  const map = {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    secondary: { bg: c.primarySoft, fg: c.primary, border: c.primarySoft },
    outline: { bg: c.surface, fg: c.text, border: c.border },
    ghost: { bg: 'transparent', fg: c.text, border: 'transparent' },
    destructive: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
    dark: { bg: c.dock, fg: '#fff', border: c.dock },
  }[variant];
  const h = { sm: 36, md: 46, lg: 54 }[size];
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
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={map.fg} />
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 16 : 18} color={map.fg} strokeWidth={2.2} />}
          {title && (
            <Text variant="label" style={{ fontFamily: font.semibold, fontSize: size === 'sm' ? 13 : 15 }} color={map.fg}>
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
  const { c } = useTheme();
  const bg = { primary: c.primary, secondary: c.primarySoft, outline: c.surface, ghost: 'transparent', destructive: c.dangerSoft, dark: c.dock }[
    variant
  ];
  const fg = color ?? { primary: '#fff', secondary: c.primary, outline: c.text, ghost: c.text, destructive: c.danger, dark: '#fff' }[variant];
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
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        variant === 'outline' && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.border },
        pressed && { opacity: 0.7 },
        style,
      ]}>
      <View>
        <Icon size={Math.round(size * 0.45)} color={fg} strokeWidth={2} />
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
