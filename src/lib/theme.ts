import { useColorScheme } from 'react-native';

// Design tokens — shadcn/ui + Untitled UI inspired (neutral zinc scale, single accent, soft tinted surfaces).
const palette = {
  light: {
    background: '#F3F5F9',
    surface: '#FFFFFF',
    surfaceMuted: '#F7F8FB',
    border: '#E7E9EF',
    borderStrong: '#D6DAE3',
    text: '#0F1115',
    textMuted: '#5B6170',
    textSubtle: '#8C92A0',
    primary: '#3D6BF5',
    primarySoft: '#E8EEFF',
    primaryText: '#FFFFFF',
    success: '#16A34A',
    successSoft: '#E5F6EC',
    warning: '#D97706',
    warningSoft: '#FDF1DE',
    danger: '#E5484D',
    dangerSoft: '#FDE8E8',
    dock: '#0E1014',
    dockIcon: '#FFFFFF',
    overlay: 'rgba(10,12,16,0.45)',
  },
  dark: {
    background: '#0B0C10',
    surface: '#15171C',
    surfaceMuted: '#1B1E24',
    border: '#252931',
    borderStrong: '#333844',
    text: '#F4F5F7',
    textMuted: '#A3A9B6',
    textSubtle: '#6E7482',
    primary: '#5B84FF',
    primarySoft: '#1A2340',
    primaryText: '#FFFFFF',
    success: '#3CCB7F',
    successSoft: '#123222',
    warning: '#F5A524',
    warningSoft: '#33260F',
    danger: '#FF6369',
    dangerSoft: '#3A1517',
    dock: '#1E2128',
    dockIcon: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.6)',
  },
};

export type Colors = typeof palette.light;

// Module accents (pastel tint + strong tone) — used for cards, icons and charts.
export const accents = {
  blue: { light: ['#E8EEFF', '#3D6BF5'], dark: ['#1A2340', '#7C9CFF'] },
  green: { light: ['#E7F7EC', '#1F9D55'], dark: ['#122A1C', '#4ADE80'] },
  lime: { light: ['#EFF8DA', '#5E8C0A'], dark: ['#1F2810', '#A3E635'] },
  orange: { light: ['#FFF0E3', '#E2620E'], dark: ['#33200F', '#FB923C'] },
  rose: { light: ['#FDEBEF', '#D9365E'], dark: ['#38141D', '#FB7185'] },
  violet: { light: ['#F1ECFF', '#7448E8'], dark: ['#241A40', '#A78BFA'] },
  teal: { light: ['#E3F6F5', '#0F8C83'], dark: ['#0E2A28', '#2DD4BF'] },
  amber: { light: ['#FFF6DB', '#B7791F'], dark: ['#33290E', '#FBBF24'] },
  sky: { light: ['#E3F3FD', '#0B84C6'], dark: ['#0E2433', '#38BDF8'] },
  slate: { light: ['#EEF0F4', '#475066'], dark: ['#1E2229', '#A3ADC2'] },
} as const;
export type Accent = keyof typeof accents;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = palette[scheme];
  const accent = (a: Accent) => {
    const [soft, strong] = accents[a][scheme];
    return { soft, strong };
  };
  return { c, scheme, accent, isDark: scheme === 'dark' };
}

export const shadow = {
  shadowColor: '#101828',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
