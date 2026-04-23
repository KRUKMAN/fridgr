/* eslint-disable react-native/no-inline-styles */

import { Text, View } from 'react-native';

import { Card } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function SignInScreen(): JSX.Element {
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
              color: theme.colors.textMuted,
              fontSize: theme.typography.captionStrong.fontSize,
              fontWeight: theme.typography.captionStrong.fontWeight,
              letterSpacing: 1.2,
              lineHeight: theme.typography.captionStrong.lineHeight,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            Fridgr
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
            Sign in placeholder
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
            Wave 2 auth screens land here. The router shell is ready.
          </Text>
        </View>
      </Card>
    </View>
  );
}
