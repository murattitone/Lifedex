import { ArrowUpRight, Check, Star, type LucideIcon } from 'lucide-react-native';
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { font, radius, useTheme } from '@/lib/theme';
import { haptic } from './button';
import { Text } from './text';

export function Badge({ label, color, bg, icon: Icon }: { label: string; color?: string; bg?: string; icon?: LucideIcon }) {
  const { c } = useTheme();
  const fg = color ?? c.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? 'transparent', borderColor: bg ?? c.border }]}>
      {Icon && <Icon size={11} color={fg} strokeWidth={2} />}
      <Text variant="caption" style={{ fontFamily: font.medium, fontSize: 11.5, lineHeight: 15 }} color={fg}>
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
      style={[styles.chip, { backgroundColor: active ? c.primary : 'transparent', borderColor: active ? c.primary : c.border }]}>
      {Icon && <Icon size={13} color={active ? c.primaryText : c.textMuted} strokeWidth={1.8} />}
      <Text variant="label" style={{ fontFamily: active ? font.semibold : font.medium }} color={active ? c.primaryText : c.textMuted}>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }} style={{ flexGrow: 0 }}>
      {chips}
    </ScrollView>
  );
}

/** Underlined text tabs — reads like section tabs in a printed index. */
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
    <View style={[styles.tabs, { borderBottomColor: c.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptic();
              onChange(o.value);
            }}
            style={[styles.tab, { borderBottomColor: active ? c.text : 'transparent' }]}>
            <Text variant="bodyMedium" style={{ fontFamily: active ? font.semibold : font.medium }} tone={active ? 'default' : 'subtle'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ checked, onPress, color, size = 22 }: { checked: boolean; onPress?: () => void; color?: string; size?: number }) {
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
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: checked ? tone : c.borderStrong,
        backgroundColor: checked ? tone : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {checked && <Check size={size * 0.62} color={color ? '#fff' : c.primaryText} strokeWidth={3} />}
    </Pressable>
  );
}

export function Progress({ value, color, height = 4, track }: { value: number; color?: string; height?: number; track?: string }) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ height, borderRadius: 1, backgroundColor: track ?? c.border, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color ?? c.text }} />
    </View>
  );
}

/** Ledger-style tick bar: each tick is one unit of the goal (e.g. a glass of water). */
export function Ticks({
  value,
  goal,
  count = 12,
  color,
  height = 12,
}: {
  value: number;
  goal: number;
  count?: number;
  color?: string;
  height?: number;
}) {
  const { c } = useTheme();
  const filled = Math.min(count, Math.round((value / Math.max(goal, 1)) * count));
  const over = value > goal;
  return (
    <View style={{ flexDirection: 'row', gap: 4, height, alignItems: 'flex-end' }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: i < filled ? height : 3,
            borderRadius: 1,
            backgroundColor: i < filled ? (over && i === count - 1 ? c.signal : (color ?? c.text)) : c.border,
          }}
        />
      ))}
    </View>
  );
}

export function Ring({
  value,
  size = 64,
  stroke = 4,
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
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? c.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? c.text}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Numbered section heading over a hairline rule: "02 — Antrenman ........ Tümü ↗" */
export function SectionHeader({
  title,
  action,
  onAction,
  index,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  index?: number | string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: c.text }]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flex: 1 }}>
        {index !== undefined && (
          <Text variant="overline" tone="subtle">
            {typeof index === 'number' ? String(index).padStart(2, '0') : index}
          </Text>
        )}
        <Text variant="overline">{title}</Text>
      </View>
      {action && (
        <Pressable onPress={onAction} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text variant="overline" tone="muted">
            {action}
          </Text>
          <ArrowUpRight size={12} color={c.textMuted} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

/** Empty states are onboarding moments: say what the section is for and offer the first step. */
export function EmptyState({ title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: c.border }]}>
      <Text variant="heading">{title}</Text>
      {text && (
        <Text variant="body" tone="muted" style={{ maxWidth: 420 }}>
          {text}
        </Text>
      )}
      {action && <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>{action}</View>}
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
            <Star size={size} color={filled ? c.text : c.borderStrong} fill={filled ? c.text : 'transparent'} strokeWidth={1.6} />
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
      {Icon && <Icon size={18} color={c.textMuted} strokeWidth={1.7} />}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        {hint && (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.text, false: c.borderStrong }}
        thumbColor={c.surface}
        {...({ activeThumbColor: c.surface, activeTrackColor: c.text } as object)}
      />
    </View>
  );
}

export function ListRow({
  label,
  hint,
  icon: Icon,
  iconColor,
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
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }, style]}>
      {Icon && <Icon size={18} color={iconColor ?? c.textMuted} strokeWidth={1.7} />}
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
      {right ?? (onPress && <ArrowUpRight size={16} color={c.textSubtle} strokeWidth={1.8} />)}
    </Pressable>
  );
}

/** Rows separated by hairlines, opened by a rule — the default way to show a list. */
export function RuledList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ borderTopWidth: 1, borderTopColor: c.border }, style]}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <Divider />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

/** Small outlined glyph. Color carries meaning only (red = holiday/important, green = religious/done). */
export function IconTile({ icon: Icon, color, size = 36 }: { icon: LucideIcon; color: string; bg?: string; size?: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={size * 0.46} color={color} strokeWidth={1.7} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: radius.sm, borderWidth: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tabs: { flexDirection: 'row', gap: 22, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, borderBottomWidth: 2, marginBottom: -1 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1.5, paddingTop: 10, marginTop: 14 },
  empty: { gap: 6, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
