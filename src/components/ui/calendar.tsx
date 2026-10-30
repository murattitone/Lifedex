import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayKey, fmt } from '@/lib/date';
import { font, useTheme } from '@/lib/theme';
import { IconButton } from './button';
import { Text } from './text';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

export function MonthCalendar({ value, onChange, marks = {} }: { value: string; onChange: (day: string) => void; marks?: Record<string, string[]> }) {
  const { c } = useTheme();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = value.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const today = dayKey();

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(first);
    start.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.head}>
        <Text variant="heading" style={{ textTransform: 'capitalize', fontFamily: font.bold }}>
          {fmt(cursor, 'MMMM yyyy')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon={ChevronLeft} size={34} onPress={() => shift(-1)} accessibilityLabel="Önceki ay" />
          <IconButton icon={ChevronRight} size={34} onPress={() => shift(1)} accessibilityLabel="Sonraki ay" />
        </View>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={w} style={styles.cell}>
            <Text variant="overline" tone={i === 6 ? 'signal' : 'subtle'}>
              {w}
            </Text>
          </View>
        ))}
        {cells.map((d) => {
          const key = dayKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const selected = key === value;
          const isToday = key === today;
          const dots = marks[key] ?? [];
          const sunday = d.getDay() === 0;
          return (
            <Pressable key={key} style={styles.cell} onPress={() => onChange(key)}>
              <View
                style={[styles.day, selected && { backgroundColor: c.primary }, !selected && isToday && { borderWidth: 1.5, borderColor: c.signal }]}>
                <Text
                  variant="figure"
                  style={{ fontSize: 18, fontFamily: selected || isToday ? font.numeral : font.numeralMedium, opacity: inMonth ? 1 : 0.35 }}
                  color={selected ? c.primaryText : sunday ? c.signal : c.text}>
                  {d.getDate()}
                </Text>
              </View>
              <View style={styles.dots}>
                {dots.slice(0, 3).map((color, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: color }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
