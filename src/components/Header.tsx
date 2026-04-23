/* eslint-disable react-native/no-inline-styles */

import { Text, View } from 'react-native';

import { useTheme } from '../theme';
import { IconButton } from './IconButton';

import type { JSX, ReactNode } from 'react';

export type HeaderProps = Readonly<{
  left?: ReactNode;
  onBackPress?: () => void;
  right?: ReactNode;
  subtitle?: string;
  title: string;
}>;

export function Header({ left, onBackPress, right, subtitle, title }: HeaderProps): JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.spacing.md,
        minHeight: theme.componentSizes.button.lg,
      }}
    >
      <View style={{ minWidth: theme.componentSizes.iconButton.md }}>
        {left ??
          (onBackPress ? (
            <IconButton
              accessibilityLabel="Go back"
              icon="arrow-back"
              onPress={onBackPress}
              variant="ghost"
            />
          ) : null)}
      </View>

      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text
          accessibilityRole="header"
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.title.fontSize,
            fontWeight: theme.typography.title.fontWeight,
            lineHeight: theme.typography.title.lineHeight,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            allowFontScaling
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.typography.caption.fontSize,
              fontWeight: theme.typography.caption.fontWeight,
              lineHeight: theme.typography.caption.lineHeight,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={{ minWidth: theme.componentSizes.iconButton.md }}>{right}</View>
    </View>
  );
}
