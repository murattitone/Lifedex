import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { font, radius, useTheme } from '@/lib/theme';
import { Text } from './text';

export function Input({ label, hint, error, style, multiline, ...props }: TextInputProps & { label?: string; hint?: string; error?: string }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={c.textSubtle}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: c.text,
            backgroundColor: c.surface,
            borderColor: error ? c.danger : focused ? c.primary : c.border,
            minHeight: multiline ? 110 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? 12 : 0,
          },
          focused && { boxShadow: `0 0 0 3px ${c.primarySoft}` },
          style,
        ]}
        {...props}
      />
      {(error || hint) && (
        <Text variant="caption" tone={error ? 'danger' : 'subtle'}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontFamily: font.regular,
    fontSize: 15,
    outlineStyle: 'none' as any,
  },
});
