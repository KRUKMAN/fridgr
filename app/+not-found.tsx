/* eslint-disable react-native/no-inline-styles */

import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function NotFoundScreen(): JSX.Element {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
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
                color: theme.colors.text,
                fontSize: theme.typography.display.fontSize,
                fontWeight: theme.typography.display.fontWeight,
                lineHeight: theme.typography.display.lineHeight,
                textAlign: 'center',
              }}
            >
              Screen not found
            </Text>
            <Link asChild href="/">
              <Button label="Go home" />
            </Link>
          </View>
        </Card>
      </View>
    </>
  );
}
