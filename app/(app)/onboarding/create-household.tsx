/* eslint-disable react-native/no-inline-styles */

import { Text, View } from 'react-native';

import { Button, Card } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function CreateHouseholdPlaceholder(): JSX.Element {
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
        <View style={{ gap: theme.spacing.md }}>
          <Text
            allowFontScaling
            style={{
              color: theme.colors.primary,
              fontSize: theme.typography.captionStrong.fontSize,
              fontWeight: theme.typography.captionStrong.fontWeight,
              letterSpacing: 1.2,
              lineHeight: theme.typography.captionStrong.lineHeight,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            Onboarding
          </Text>
          <Text
            allowFontScaling
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.display.fontSize,
              fontWeight: theme.typography.display.fontWeight,
              lineHeight: theme.typography.display.lineHeight,
              textAlign: 'center',
            }}
          >
            Create household placeholder
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
            Batch 4 will turn this into the real create-household flow.
          </Text>
          <Button label="Join instead" variant="secondary" />
        </View>
      </Card>
    </View>
  );
}
