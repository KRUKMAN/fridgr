/* eslint-disable react-native/no-inline-styles */

import { Pressable, View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, ReactNode } from 'react';

export type CardProps = Readonly<{
  children: ReactNode;
  onPress?: () => void;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'soft' | 'hero' | 'electric';
}> &
  ViewProps;

export function Card({
  children,
  onPress,
  padding = 'md',
  style,
  variant = 'default',
  ...props
}: CardProps): JSX.Element {
  const theme = useTheme();
  const palette = getCardPalette(theme, variant);
  const baseStyle = {
    backgroundColor: palette.backgroundColor,
    borderColor: palette.borderColor,
    borderRadius: theme.radii.xl,
    borderWidth: palette.borderWidth,
    padding: theme.spacing[padding],
    shadowColor: palette.shadowColor,
    ...(variant === 'electric' ? theme.shadows.glow : theme.shadows.card),
  } as const;

  if (!onPress) {
    return (
      <View {...props} style={[baseStyle, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        baseStyle,
        { opacity: pressed ? theme.opacities.pressed : 1 },
        { transform: [{ scale: pressed ? 0.985 : 1 }] },
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

function getCardPalette(
  theme: ReturnType<typeof useTheme>,
  variant: NonNullable<CardProps['variant']>,
): Readonly<{
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  shadowColor: string;
}> {
  switch (variant) {
    case 'soft':
      return {
        backgroundColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.surfaceMuted,
        borderWidth: theme.borderWidths.none,
        shadowColor: theme.colors.shadow,
      };
    case 'hero':
      return {
        backgroundColor: theme.colors.primarySoft,
        borderColor: theme.colors.primaryContainer,
        borderWidth: theme.borderWidths.thick,
        shadowColor: theme.colors.primary,
      };
    case 'electric':
      return {
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.electricPink,
        borderWidth: theme.borderWidths.thick,
        shadowColor: theme.colors.electricPink,
      };
    case 'default':
    default:
      return {
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
        borderWidth: theme.borderWidths.thin,
        shadowColor: theme.colors.shadow,
      };
  }
}
