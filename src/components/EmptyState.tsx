/* eslint-disable react-native/no-inline-styles */

import { Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';

import type { JSX, ReactNode } from 'react';

export type EmptyStateProps = Readonly<{
  actionLabel?: string;
  description: string;
  icon?: ReactNode;
  onActionPress?: () => void;
  title: string;
}>;

export function EmptyState({
  actionLabel,
  description,
  icon,
  onActionPress,
  title,
}: EmptyStateProps): JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.xxl,
        borderWidth: theme.borderWidths.thick,
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
      }}
    >
      {icon ? <View>{icon}</View> : null}
      <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <Text
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.heading.fontSize,
            fontWeight: theme.typography.heading.fontWeight,
            lineHeight: theme.typography.heading.lineHeight,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          allowFontScaling
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.typography.body.fontSize,
            fontWeight: theme.typography.body.fontWeight,
            lineHeight: theme.typography.body.lineHeight,
            textAlign: 'center',
          }}
        >
          {description}
        </Text>
      </View>
      {actionLabel && onActionPress ? (
        <Button fullWidth={false} label={actionLabel} onPress={onActionPress} />
      ) : null}
    </View>
  );
}
