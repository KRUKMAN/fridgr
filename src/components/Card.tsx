/* eslint-disable react-native/no-inline-styles */

import { Pressable, View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, ReactNode } from 'react';

export type CardProps = Readonly<{
  children: ReactNode;
  onPress?: () => void;
  padding?: 'sm' | 'md' | 'lg';
}> &
  ViewProps;

export function Card({
  children,
  onPress,
  padding = 'md',
  style,
  ...props
}: CardProps): JSX.Element {
  const theme = useTheme();
  const baseStyle = {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: theme.borderWidths.thin,
    padding: theme.spacing[padding],
    shadowColor: theme.colors.shadow,
    ...theme.shadows.card,
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
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
