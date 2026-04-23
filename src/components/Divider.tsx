/* eslint-disable react-native/no-inline-styles */

import { View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX } from 'react';

export type DividerProps = Readonly<{
  inset?: 'none' | 'md' | 'lg';
}>;

export function Divider({ inset = 'none' }: DividerProps): JSX.Element {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        backgroundColor: theme.colors.border,
        height: theme.borderWidths.hairline,
        marginLeft: inset === 'none' ? 0 : theme.spacing[inset],
        width: '100%',
      }}
    />
  );
}
