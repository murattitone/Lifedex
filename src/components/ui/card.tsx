import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { radius, useTheme } from '@/lib/theme';
import { haptic } from './button';

/**
 * Plain card = an editorial ruled block (top hairline, vertical rhythm, no box).
 * Tinted card = the only boxed surface, reserved for content that should stand apart.
 */
export function Card({
  children,
  style,
  tint,
  onPress,
  onLongPress,
  padded = true,
  ...props
}: ViewProps & {
  tint?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const base: StyleProp<ViewStyle> = [
    tint
      ? [styles.box, { backgroundColor: tint }, padded && { padding: 16 }]
      : [styles.ruled, { borderTopColor: c.border }, padded && { paddingVertical: 14 }],
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
      style={({ pressed }) => [base, pressed && { opacity: 0.75 }]}
      {...props}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg },
  ruled: { borderTopWidth: 1 },
});
