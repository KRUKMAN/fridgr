/* eslint-disable react-native/no-inline-styles */

import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, ReactNode } from 'react';

export type ChipVariant = 'neutral' | 'active' | 'warning' | 'fresh' | 'danger' | 'electric';

export type ChipProps = Readonly<{
  icon?: ReactNode;
  label: string;
  onPress?: () => void;
  variant?: ChipVariant;
}>;

export function Chip({ icon, label, onPress, variant = 'neutral' }: ChipProps): JSX.Element {
  const theme = useTheme();
  const palette = getChipPalette(theme, variant);
  const content = (
    <>
      {icon ? <View>{icon}</View> : null}
      <Text
        allowFontScaling
        style={{
          color: palette.foregroundColor,
          fontSize: theme.typography.captionStrong.fontSize,
          fontWeight: theme.typography.captionStrong.fontWeight,
          lineHeight: theme.typography.captionStrong.lineHeight,
        }}
      >
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View
        style={{
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderRadius: theme.radii.full,
          borderWidth: palette.borderWidth,
          flexDirection: 'row',
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        borderRadius: theme.radii.full,
        borderWidth: palette.borderWidth,
        flexDirection: 'row',
        gap: theme.spacing.xs,
        opacity: pressed ? theme.opacities.pressed : 1,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {content}
    </Pressable>
  );
}

function getChipPalette(
  theme: ReturnType<typeof useTheme>,
  variant: ChipVariant,
): Readonly<{
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  foregroundColor: string;
}> {
  switch (variant) {
    case 'active':
      return {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        borderWidth: theme.borderWidths.none,
        foregroundColor: theme.colors.primaryForeground,
      };
    case 'warning':
      return {
        backgroundColor: theme.colors.warningSoft,
        borderColor: theme.colors.warning,
        borderWidth: theme.borderWidths.thick,
        foregroundColor: theme.colors.warning,
      };
    case 'fresh':
      return {
        backgroundColor: theme.colors.successSoft,
        borderColor: theme.colors.success,
        borderWidth: theme.borderWidths.thick,
        foregroundColor: theme.colors.success,
      };
    case 'danger':
      return {
        backgroundColor: theme.colors.destructiveSoft,
        borderColor: theme.colors.destructive,
        borderWidth: theme.borderWidths.thick,
        foregroundColor: theme.colors.destructive,
      };
    case 'electric':
      return {
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.electricCyan,
        borderWidth: theme.borderWidths.thick,
        foregroundColor: theme.colors.secondary,
      };
    case 'neutral':
    default:
      return {
        backgroundColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.surfaceMuted,
        borderWidth: theme.borderWidths.none,
        foregroundColor: theme.colors.textMuted,
      };
  }
}
