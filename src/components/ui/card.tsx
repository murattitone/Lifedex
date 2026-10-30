import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { radius, shadow, useTheme } from '@/lib/theme';
import { haptic } from './button';

export function Card({
  children,
  style,
  tint,
  onPress,
  onLongPress,
  padded = true,
  flat,
  ...props
}: ViewProps & {
  tint?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, isDark } = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: tint ?? c.surface, borderColor: tint ? 'transparent' : c.border },
    padded && { padding: 16 },
    !flat && !isDark && shadow,
    style,
  ];
  if (!onPress && !onLongPress) {
    return (
      <View style={base} {...props}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
      {...props}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
});
