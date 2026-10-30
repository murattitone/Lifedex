import { View } from 'react-native';

import { useTheme } from '@/lib/theme';
import { Text } from './ui/text';

/** Minimal bar chart: values with labels; highlights the last bar and draws an optional goal line. */
export function Bars({
  values,
  labels,
  color,
  goal,
  height = 110,
  highlight,
}: {
  values: number[];
  labels?: string[];
  color?: string;
  goal?: number;
  height?: number;
  highlight?: number;
}) {
  const { c } = useTheme();
  const max = Math.max(goal ?? 0, ...values, 1);
  const hi = highlight ?? values.length - 1;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {goal ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: (goal / max) * height,
              borderTopWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.borderStrong,
            }}
          />
        ) : null}
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View
              style={{
                height: Math.max(4, (v / max) * height),
                borderRadius: 6,
                backgroundColor: i === hi ? (color ?? c.primary) : `${color ?? c.primary}55`,
              }}
            />
          </View>
        ))}
      </View>
      {labels && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {labels.map((l, i) => (
            <Text key={i} variant="caption" tone={i === hi ? 'default' : 'subtle'} style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
