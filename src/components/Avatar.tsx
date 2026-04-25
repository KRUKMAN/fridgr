/* eslint-disable react-native/no-inline-styles */

import { Image, Text, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = Readonly<{
  accessibilityLabel?: string;
  name: string;
  size?: AvatarSize;
  uri?: string | null;
}>;

export function Avatar({ accessibilityLabel, name, size = 'md', uri }: AvatarProps): JSX.Element {
  const theme = useTheme();
  const dimension = theme.componentSizes.avatar[size];
  const initials = getInitials(name);

  if (uri) {
    return (
      <Image
        accessibilityLabel={accessibilityLabel ?? `${name} avatar`}
        source={{ uri }}
        style={{
          backgroundColor: theme.colors.primarySoft,
          borderRadius: theme.radii.full,
          height: dimension,
          width: dimension,
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? `${name} initials avatar`}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.primarySoft,
        borderRadius: theme.radii.full,
        height: dimension,
        justifyContent: 'center',
        width: dimension,
      }}
    >
      <Text
        allowFontScaling
        style={{
          color: theme.colors.primary,
          fontSize:
            size === 'lg'
              ? theme.typography.heading.fontSize
              : theme.typography.captionStrong.fontSize,
          fontWeight:
            size === 'lg'
              ? theme.typography.heading.fontWeight
              : theme.typography.captionStrong.fontWeight,
          lineHeight:
            size === 'lg'
              ? theme.typography.heading.lineHeight
              : theme.typography.captionStrong.lineHeight,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}
