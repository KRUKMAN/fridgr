/* eslint-disable react-native/no-inline-styles */

import { Text, View } from 'react-native';

import { Card } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function DashboardTab(): JSX.Element {
  return (
    <TabPlaceholder description="Home dashboard wiring lands in a later wave." title="Dashboard" />
  );
}

export function TabPlaceholder({
  description,
  title,
}: Readonly<{
  description: string;
  title: string;
}>): JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.xl,
      }}
    >
      <Card padding="lg">
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            allowFontScaling
            style={{
              color: theme.colors.primary,
              fontSize: theme.typography.captionStrong.fontSize,
              fontWeight: theme.typography.captionStrong.fontWeight,
              lineHeight: theme.typography.captionStrong.lineHeight,
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
      </Card>
    </View>
  );
}
