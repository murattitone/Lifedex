import { Text as RNText, type TextProps } from 'react-native';

import { font, useTheme, type Colors } from '@/lib/theme';

const variants = {
  numeral: { fontFamily: font.numeral, fontSize: 132, lineHeight: 120, letterSpacing: -2 },
  display: { fontFamily: font.black, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  title: { fontFamily: font.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.8 },
  heading: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.25 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17 },
  overline: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.3, textTransform: 'uppercase' as const },
  stat: { fontFamily: font.numeral, fontSize: 34, lineHeight: 34, letterSpacing: -0.3 },
  figure: { fontFamily: font.numeralMedium, fontSize: 20, lineHeight: 22 },
} as const;

const tones = {
  default: 'text',
  muted: 'textMuted',
  subtle: 'textSubtle',
  primary: 'text',
  signal: 'signal',
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
