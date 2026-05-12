/* eslint-disable react-native/no-inline-styles */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, ReactNode } from 'react';

export type ListItemProps = Readonly<{
  accessibilityLabel?: string;
  left?: ReactNode;
  onPress?: () => void;
  right?: ReactNode;
  showChevron?: boolean;
  subtitle?: string;
  title: string;
}>;

export function ListItem({
  accessibilityLabel,
  left,
  onPress,
  right,
  showChevron = false,
  subtitle,
  title,
}: ListItemProps): JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.xl,
        borderWidth: theme.borderWidths.thin,
        flexDirection: 'row',
        gap: theme.spacing.md,
        opacity: pressed ? theme.opacities.pressed : 1,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {left ? <View>{left}</View> : null}

      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.bodyStrong.fontSize,
            fontWeight: theme.typography.bodyStrong.fontWeight,
            lineHeight: theme.typography.bodyStrong.lineHeight,
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

      {right ??
        (showChevron ? (
          <Ionicons
            color={theme.colors.textMuted}
            name="chevron-forward"
            size={theme.iconSizes.md}
          />
        ) : null)}
    </Pressable>
  );
}
