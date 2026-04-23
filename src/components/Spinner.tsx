/* eslint-disable react-native/no-inline-styles */

import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX } from 'react';

export type SpinnerProps = Readonly<{
  centered?: boolean;
  size?: 'small' | 'large';
}>;

export function Spinner({ centered = true, size = 'large' }: SpinnerProps): JSX.Element {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: centered ? theme.spacing.xxxl * 2 : undefined,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} size={size} />
    </View>
  );
}
