/* eslint-disable react-native/no-inline-styles */

import { memo } from 'react';
import { Text, View } from 'react-native';

import { getExpiryIndicatorState } from '../lib/expiryIndicator';
import { useTheme } from '../theme';

import type { ExpiryIndicatorState } from '../lib/expiryIndicator';
import type { JSX } from 'react';

export type ExpiryIndicatorProps = Readonly<{
  compact?: boolean;
  date: Date | string | null;
  inline?: boolean;
}>;

export const ExpiryIndicator = memo(function ExpiryIndicator({
  compact = false,
  date,
  inline = false,
}: ExpiryIndicatorProps): JSX.Element {
  const theme = useTheme();
  const state = getExpiryIndicatorState(date);
  const palette = getExpiryPalette(theme, state);

  if (inline) {
    return (
      <Text
        accessibilityLabel={state.accessibilityLabel}
        allowFontScaling
        style={{
          color: palette.foregroundColor,
          fontSize: theme.typography.captionStrong.fontSize,
          fontWeight: theme.typography.captionStrong.fontWeight,
          lineHeight: theme.typography.captionStrong.lineHeight,
        }}
      >
        {state.label}
      </Text>
    );
  }

  return (
    <View
      accessibilityLabel={state.accessibilityLabel}
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        borderRadius: theme.radii.full,
        borderWidth: theme.borderWidths.thick,
        minHeight: compact ? 26 : 30,
        paddingHorizontal: compact ? theme.spacing.sm : theme.spacing.md,
        paddingVertical: compact ? theme.spacing.xs : theme.spacing.sm,
      }}
    >
      <Text
        allowFontScaling
        numberOfLines={1}
        style={{
          color: palette.foregroundColor,
          fontSize: compact
            ? theme.typography.micro.fontSize
            : theme.typography.captionStrong.fontSize,
          fontWeight: compact
            ? theme.typography.micro.fontWeight
            : theme.typography.captionStrong.fontWeight,
          lineHeight: compact
            ? theme.typography.micro.lineHeight
            : theme.typography.captionStrong.lineHeight,
        }}
      >
        {state.label}
      </Text>
    </View>
  );
});

function getExpiryPalette(
  theme: ReturnType<typeof useTheme>,
  state: ExpiryIndicatorState,
): Readonly<{
  backgroundColor: string;
  borderColor: string;
  foregroundColor: string;
}> {
  switch (state.tone) {
    case 'danger':
      return {
        backgroundColor: theme.colors.status.expiredSoft,
        borderColor: theme.colors.status.expired,
        foregroundColor: theme.colors.status.expired,
      };
    case 'warning':
      return {
        backgroundColor: theme.colors.status.warningSoft,
        borderColor: theme.colors.status.warning,
        foregroundColor: theme.colors.status.warning,
      };
    case 'fresh':
      return {
        backgroundColor: theme.colors.status.okSoft,
        borderColor: theme.colors.status.ok,
        foregroundColor: theme.colors.status.ok,
      };
    case 'neutral':
    default:
      return {
        backgroundColor: theme.colors.status.neutralSoft,
        borderColor: theme.colors.status.neutral,
        foregroundColor: theme.colors.status.neutral,
      };
  }
}
