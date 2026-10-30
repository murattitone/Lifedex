import { Check, ChevronRight, Star, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { font, radius, useTheme } from '@/lib/theme';
import { haptic } from './button';
import { Text } from './text';

export function Badge({ label, color, bg, icon: Icon }: { label: string; color?: string; bg?: string; icon?: LucideIcon }) {
  const { c } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? c.surfaceMuted, borderColor: bg ? 'transparent' : c.border }]}>
      {Icon && <Icon size={12} color={color ?? c.textMuted} />}
      <Text variant="caption" style={{ fontFamily: font.medium }} color={color ?? c.textMuted}>
        {label}
      </Text>
    </View>
  );
}

export function Chip({ label, active, onPress, icon: Icon }: { label: string; active?: boolean; onPress?: () => void; icon?: LucideIcon }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress?.();
      }}
      style={[styles.chip, { backgroundColor: active ? c.text : c.surface, borderColor: active ? c.text : c.border }]}>
      {Icon && <Icon size={14} color={active ? c.background : c.textMuted} />}
      <Text variant="label" color={active ? c.background : c.textMuted}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  scroll = true,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  scroll?: boolean;
}) {
  const chips = options.map((o) => <Chip key={o.value} label={o.label} icon={o.icon} active={o.value === value} onPress={() => onChange(o.value)} />);
  if (!scroll) return <View style={styles.wrap}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ flexGrow: 0 }}>
      {chips}
    </ScrollView>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic();
              onChange(o.value);
            }}
            style={[styles.segment, active && { backgroundColor: c.surface, boxShadow: '0 1px 3px rgba(16,24,40,0.10)' }]}>
            <Text variant="label" style={{ fontFamily: active ? font.semibold : font.medium }} tone={active ? 'default' : 'muted'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ checked, onPress, color, size = 24 }: { checked: boolean; onPress?: () => void; color?: string; size?: number }) {
  const { c } = useTheme();
  const tone = color ?? c.primary;
  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        haptic(checked ? 'light' : 'success');
        onPress?.();
      }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 3.2,
        borderWidth: 1.5,
        borderColor: checked ? tone : c.borderStrong,
        backgroundColor: checked ? tone : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {checked && <Check size={size * 0.62} color="#fff" strokeWidth={3} />}
    </Pressable>
  );
}

export function Progress({ value, color, height = 8, track }: { value: number; color?: string; height?: number; track?: string }) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? c.surfaceMuted, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: color ?? c.primary }} />
    </View>
  );
}

export function Ring({
  value,
  size = 64,
  stroke = 7,
  color,
  track,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? c.surfaceMuted} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? c.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="label" tone="primary">
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: c.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surfaceMuted }]}>
        <Icon size={22} color={c.textMuted} />
      </View>
      <Text variant="bodyMedium">{title}</Text>
      {text && (
        <Text variant="caption" tone="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
          {text}
        </Text>
      )}
      {action}
    </View>
  );
}

export function Rating({ value, onChange, size = 22, max = 5 }: { value: number; onChange?: (v: number) => void; size?: number; max?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <Pressable
            key={i}
            disabled={!onChange}
            hitSlop={4}
            onPress={() => {
              haptic();
              onChange?.(value === i + 1 ? 0 : i + 1);
            }}>
            <Star size={size} color={filled ? '#F5A524' : c.borderStrong} fill={filled ? '#F5A524' : 'transparent'} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: LucideIcon;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      {Icon && (
        <View style={[styles.rowIcon, { backgroundColor: c.surfaceMuted }]}>
          <Icon size={18} color={c.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        {hint && (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.borderStrong }} thumbColor="#fff" />
    </View>
  );
}

export function ListRow({
  label,
  hint,
  icon: Icon,
  iconColor,
  iconBg,
  right,
  onPress,
  style,
}: {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  right?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }, style]}>
      {Icon && (
        <View style={[styles.rowIcon, { backgroundColor: iconBg ?? c.surfaceMuted }]}>
          <Icon size={18} color={iconColor ?? c.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {label}
        </Text>
        {hint && (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {hint}
          </Text>
        )}
      </View>
      {right ?? (onPress && <ChevronRight size={18} color={c.textSubtle} />)}
    </Pressable>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.border }} />;
}

export function IconTile({ icon: Icon, color, bg, size = 40 }: { icon: LucideIcon; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.5} color={color} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.full, borderWidth: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.md, borderWidth: 1 },
  segment: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 20, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
