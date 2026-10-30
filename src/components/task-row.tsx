import { router } from 'expo-router';
import { AlarmClock, Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToggleDone } from '@/lib/data';
import { relativeDateTime } from '@/lib/date';
import { useTheme } from '@/lib/theme';
import type { Item } from '@/lib/types';
import { Checkbox } from './ui/misc';
import { Text } from './ui/text';

export function TaskRow({ item, showDate = true }: { item: Item; showDate?: boolean }) {
  const { c } = useTheme();
  const toggle = useToggleDone();
  const done = !!item.completed_at;
  const overdue = !done && item.due_at && new Date(item.due_at) < new Date();
  const priority = item.data?.priority;
  return (
    <Pressable onPress={() => router.push(`/item/${item.id}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Checkbox checked={done} onPress={() => toggle(item)} color={priority === 'high' ? c.danger : undefined} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          tone={done ? 'subtle' : 'default'}
          style={done ? { textDecorationLine: 'line-through' } : undefined}>
          {item.title}
        </Text>
        {showDate && item.due_at && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {item.remind_at && (item.data?.alarm ? <AlarmClock size={12} color={c.textSubtle} /> : <Bell size={12} color={c.textSubtle} />)}
            <Text variant="caption" tone={overdue ? 'danger' : 'muted'}>
              {relativeDateTime(item.due_at)}
            </Text>
          </View>
        )}
      </View>
      {priority === 'high' && !done && <View style={[styles.dot, { backgroundColor: c.danger }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
