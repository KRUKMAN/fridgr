/* eslint-disable react-native/no-inline-styles */

import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme';

import type { JSX } from 'react';

export type InputProps = Readonly<{
  errorText?: string;
  helperText?: string;
  label?: string;
  rightAdornment?: React.ReactNode;
}> &
  TextInputProps;

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    accessibilityLabel,
    errorText,
    helperText,
    label,
    onBlur,
    onFocus,
    rightAdornment,
    style,
    ...props
  },
  ref,
): JSX.Element {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorText);
  const hint = errorText ?? helperText;

  const borderColor = hasError
    ? theme.colors.destructive
    : isFocused
      ? theme.colors.secondary
      : theme.colors.border;

  const borderWidth = hasError
    ? theme.borderWidths.thick
    : isFocused
      ? theme.borderWidths.chunky
      : theme.borderWidths.thin;

  const glowStyle =
    isFocused && !hasError
      ? {
          shadowColor: theme.colors.secondary,
          ...theme.shadows.glow,
        }
      : undefined;

  return (
    <View
      style={{
        gap: theme.spacing.xs,
        width: '100%',
      }}
    >
      {label ? (
        <Text
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.captionStrong.fontSize,
            fontWeight: theme.typography.captionStrong.fontWeight,
            lineHeight: theme.typography.captionStrong.lineHeight,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          {
            alignItems: 'center',
            backgroundColor: theme.colors.inputBackground,
            borderColor,
            borderRadius: theme.radii.xl,
            borderWidth,
            flexDirection: 'row',
            minHeight: theme.componentSizes.input.minHeight,
            paddingHorizontal: theme.spacing.lg,
          },
          glowStyle,
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={accessibilityLabel ?? label}
          allowFontScaling
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          placeholderTextColor={theme.colors.inputPlaceholder}
          ref={ref}
          style={[
            {
              color: theme.colors.text,
              flex: 1,
              fontSize: theme.typography.body.fontSize,
              fontWeight: theme.typography.body.fontWeight,
              lineHeight: theme.typography.body.lineHeight,
              paddingVertical: theme.spacing.md,
            },
            style,
          ]}
        />
        {rightAdornment ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ marginLeft: theme.spacing.sm }}
          >
            {rightAdornment}
          </View>
        ) : null}
      </View>

      {hint ? (
        <Text
          allowFontScaling
          style={{
            color: hasError ? theme.colors.destructive : theme.colors.textMuted,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: theme.typography.caption.fontWeight,
            lineHeight: theme.typography.caption.lineHeight,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
