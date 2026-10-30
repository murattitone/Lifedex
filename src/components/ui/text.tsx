import { Text as RNText, type TextProps } from 'react-native';

import { font, useTheme, type Colors } from '@/lib/theme';

const variants = {
  display: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  title: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  heading: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17 },
  stat: { fontFamily: font.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
} as const;

const tones = {
  default: 'text',
  muted: 'textMuted',
  subtle: 'textSubtle',
  primary: 'primary',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
  inverse: 'primaryText',
} as const satisfies Record<string, keyof Colors>;

export type TextVariant = keyof typeof variants;

export function Text({
  variant = 'body',
  tone = 'default',
  color,
  style,
  ...props
}: TextProps & { variant?: TextVariant; tone?: keyof typeof tones; color?: string }) {
  const { c } = useTheme();
  return <RNText {...props} style={[variants[variant], { color: color ?? c[tones[tone]] }, style]} />;
}
