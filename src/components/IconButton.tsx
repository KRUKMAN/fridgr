/* eslint-disable react-native/no-inline-styles */

import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { useTheme } from '../theme';

import type { ComponentProps, JSX } from 'react';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = Readonly<{
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}>;

export function IconButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  size = 'md',
  variant = 'secondary',
}: IconButtonProps): JSX.Element {
  const theme = useTheme();
  const dimension = theme.componentSizes.iconButton[size];
  const iconDimension =
    size === 'sm' ? theme.iconSizes.sm : size === 'lg' ? theme.iconSizes.lg : theme.iconSizes.md;
  const palette = getIconButtonPalette(theme, variant, disabled);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        borderRadius: theme.radii.full,
        borderWidth: palette.borderWidth,
        height: dimension,
        justifyContent: 'center',
        opacity: pressed ? theme.opacities.pressed : 1,
        width: dimension,
      })}
    >
      <Ionicons color={palette.foregroundColor} name={icon} size={iconDimension} />
    </Pressable>
  );
}

function getIconButtonPalette(
  theme: ReturnType<typeof useTheme>,
  variant: IconButtonVariant,
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
    case 'primary':
      return {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        borderWidth: theme.borderWidths.none,
        foregroundColor: theme.colors.primaryForeground,
      };
    case 'destructive':
      return {
        backgroundColor: theme.colors.destructiveSoft,
        borderColor: theme.colors.destructiveSoft,
        borderWidth: theme.borderWidths.none,
        foregroundColor: theme.colors.destructive,
      };
    case 'ghost':
      return {
        backgroundColor: theme.colors.overlay,
        borderColor: theme.colors.overlay,
        borderWidth: theme.borderWidths.none,
        foregroundColor: theme.colors.text,
      };
    case 'secondary':
    default:
      return {
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
        borderWidth: theme.borderWidths.thin,
        foregroundColor: theme.colors.text,
      };
  }
}
