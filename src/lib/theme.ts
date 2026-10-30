import { useColorScheme } from 'react-native';

/**
 * Lifedex design language — "takvim yaprağı" (Saatli Maarif leaf), rendered modern:
 * paper + ink, one signal red (holidays/important, like printed calendars), hairline rules
 * instead of shadows, numbered sections, condensed numerals for dates and figures.
 */
const palette = {
  light: {
    background: '#F2F0EB', // paper
    surface: '#FAF9F6',
    surfaceMuted: '#E9E6DF',
    border: '#DCD8CF', // rule
    borderStrong: '#BFBAAE',
    text: '#1A1917', // ink
    textMuted: '#5F5B53',
    textSubtle: '#8F8A80',
    primary: '#1A1917',
    primarySoft: '#E9E6DF',
    primaryText: '#F7F5F0',
    signal: '#D2322B',
    signalSoft: '#F5DFDA',
    success: '#2E7A4C',
    successSoft: '#DCEADF',
    warning: '#A9600F',
    warningSoft: '#F1E3CB',
    danger: '#D2322B',
    dangerSoft: '#F5DFDA',
    dock: '#FAF9F6',
    dockIcon: '#1A1917',
    overlay: 'rgba(26,25,23,0.42)',
  },
  dark: {
    background: '#141412',
    surface: '#1B1A18',
    surfaceMuted: '#262522',
    border: '#2E2C28',
    borderStrong: '#46433D',
    text: '#EEEAE2',
    textMuted: '#A9A49A',
    textSubtle: '#76726A',
    primary: '#EEEAE2',
    primarySoft: '#2A2926',
    primaryText: '#141412',
    signal: '#EF5A4C',
    signalSoft: '#3A1E1A',
    success: '#62BC86',
    successSoft: '#17271D',
    warning: '#E0A04F',
    warningSoft: '#30250F',
    danger: '#EF5A4C',
    dangerSoft: '#3A1E1A',
    dock: '#1B1A18',
    dockIcon: '#EEEAE2',
    overlay: 'rgba(0,0,0,0.6)',
  },
};

export type Colors = typeof palette.light;

/**
 * Accent names are kept for module definitions, but the palette is deliberately restrained:
 * rose = signal red (holidays, personal days, important), green = religious/achieved, amber = offers/attention,
 * everything else resolves to ink.
 */
export type Accent = 'blue' | 'green' | 'lime' | 'orange' | 'rose' | 'violet' | 'teal' | 'amber' | 'sky' | 'slate';

export const radius = { sm: 6, md: 8, lg: 12, xl: 18, full: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const font = {
  regular: 'SchibstedGrotesk_400Regular',
  medium: 'SchibstedGrotesk_500Medium',
  semibold: 'SchibstedGrotesk_600SemiBold',
  bold: 'SchibstedGrotesk_700Bold',
  black: 'SchibstedGrotesk_800ExtraBold',
  numeral: 'BigShouldersDisplay_800ExtraBold',
  numeralMedium: 'BigShouldersDisplay_600SemiBold',
};

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = palette[scheme];
  const accent = (a: Accent) => {
    if (a === 'rose') return { soft: c.signalSoft, strong: c.signal };
    if (a === 'green' || a === 'teal') return { soft: c.successSoft, strong: c.success };
    if (a === 'amber' || a === 'orange') return { soft: c.warningSoft, strong: c.warning };
    return { soft: c.surfaceMuted, strong: c.text };
  };
  return { c, scheme, accent, isDark: scheme === 'dark' };
}

/** Hairline width used for rules */
export const HAIR = 1;
