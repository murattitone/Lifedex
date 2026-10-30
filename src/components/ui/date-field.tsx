import { CalendarDays, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { dayKey, pad, relativeDateTime, relativeDay } from '@/lib/date';
import { font, radius, useTheme } from '@/lib/theme';
import { Button } from './button';
import { MonthCalendar } from './calendar';
import { Chip } from './misc';
import { Sheet } from './sheet';
import { Text } from './text';

const QUICK_TIMES = ['08:00', '09:00', '12:00', '15:00', '18:00', '19:00', '20:00', '21:00'];

/** Cross-platform date (+ optional time) picker. Value is an ISO string or null. */
export function DateField({
  label,
  value,
  onChange,
  withTime = true,
  placeholder = 'Tarih seç',
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  withTime?: boolean;
  placeholder?: string;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const current = value ? new Date(value) : null;
  const [day, setDay] = useState(dayKey(current ?? new Date()));
  const [time, setTime] = useState(current ? `${pad(current.getHours())}:${pad(current.getMinutes())}` : '09:00');

  const apply = () => {
    const [y, m, d] = day.split('-').map(Number);
    const [hh, mm] = withTime ? time.split(':').map((n) => parseInt(n, 10) || 0) : [0, 0];
    onChange(new Date(y, m - 1, d, Math.min(23, hh), Math.min(59, mm)).toISOString());
    setOpen(false);
  };

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      )}
      <Pressable onPress={() => setOpen(true)} style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}>
        <CalendarDays size={18} color={c.textMuted} />
        <Text style={{ flex: 1 }} tone={current ? 'default' : 'subtle'}>
          {current ? (withTime ? relativeDateTime(current) : relativeDay(current)) : placeholder}
        </Text>
        {current && (
          <Pressable hitSlop={10} onPress={() => onChange(null)} accessibilityLabel="Tarihi temizle">
            <X size={16} color={c.textSubtle} />
          </Pressable>
        )}
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? 'Tarih'}>
        <MonthCalendar value={day} onChange={setDay} />
        {withTime && (
          <View style={{ gap: 10 }}>
            <Text variant="label" tone="muted">
              Saat
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_TIMES.map((t) => (
                <Chip key={t} label={t} active={t === time} onPress={() => setTime(t)} />
              ))}
            </View>
            <TextInput
              value={time}
              onChangeText={(t) => setTime(t.replace(/[^0-9:]/g, '').slice(0, 5))}
              placeholder="SS:DD"
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={c.textSubtle}
              style={[styles.time, { color: c.text, borderColor: c.border, backgroundColor: c.surfaceMuted }]}
            />
          </View>
        )}
        <Button title="Tamam" onPress={apply} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14 },
  time: {
    height: 46,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontFamily: font.medium,
    fontSize: 16,
    outlineStyle: 'none' as any,
  },
});
