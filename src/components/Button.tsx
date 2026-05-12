/* eslint-disable react-native/no-inline-styles */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Readonly<{
  accessibilityLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  label: string;
  loading?: boolean;
  onPress?: () => void;
  size?: ButtonSize;
  testID?: string;
  variant?: ButtonVariant;
}>;

export function Button({
  accessibilityLabel,
  disabled = false,
  fullWidth = true,
  iconLeft,
  iconRight,
  label,
  loading = false,
  onPress,
  size = 'md',
  testID,
  variant = 'primary',
}: ButtonProps): JSX.Element {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const palette = getButtonPalette(theme, variant, isDisabled);
  const height = theme.componentSizes.button[size];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        borderRadius: theme.radii.full,
        borderWidth: palette.borderWidth,
        justifyContent: 'center',
        minHeight: height,
        opacity: pressed ? theme.opacities.pressed : 1,
        paddingHorizontal: theme.spacing.lg,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        width: fullWidth ? '100%' : undefined,
      })}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          justifyContent: 'center',
        }}
      >
        {loading ? <ActivityIndicator color={palette.foregroundColor} /> : iconLeft}
        <Text
          allowFontScaling
          style={{
            color: palette.foregroundColor,
            fontSize: theme.typography.bodyStrong.fontSize,
            fontWeight: theme.typography.bodyStrong.fontWeight,
            lineHeight: theme.typography.bodyStrong.lineHeight,
          }}
        >
          {label}
        </Text>
        {!loading ? iconRight : null}
      </View>
    </Pressable>
  );
}

function getButtonPalette(
  theme: ReturnType<typeof useTheme>,
  variant: ButtonVariant,
  disabled: boolean,
): Readonly<{
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  foregroundColor: string;
}> {
  if (disabled) {
    return {
      backgroundColor: theme.colors.disabledSurface,
      borderColor: theme.colors.disabledSurface,
      borderWidth: theme.borderWidths.thin,
      foregroundColor: theme.colors.disabledText,
    };
  }

  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.primary,
        borderWidth: theme.borderWidths.thick,
        foregroundColor: theme.colors.primary,
      };
    case 'destructive':
      return {
        backgroundColor: theme.colors.destructiveSoft,
        borderColor: theme.colors.destructive,
        borderWidth: theme.borderWidths.thick,
        foregroundColor: theme.colors.destructive,
      };
    case 'ghost':
      return {
        backgroundColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.surfaceMuted,
        borderWidth: theme.borderWidths.none,
        foregroundColor: theme.colors.textMuted,
      };
    case 'primary':
    default:
      return {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        borderWidth: theme.borderWidths.none,
        foregroundColor: theme.colors.primaryForeground,
      };
  }
}
