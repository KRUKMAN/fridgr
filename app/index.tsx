/* eslint-disable react-native/no-inline-styles */

import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function IndexRoute(): JSX.Element {
  const theme = useTheme();

  if (__DEV__) {
    return <Redirect href="/_demo/components" />;
  }

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
      <Text
        allowFontScaling
        style={{
          color: theme.colors.text,
          fontSize: theme.typography.body.fontSize,
          fontWeight: theme.typography.body.fontWeight,
          lineHeight: theme.typography.body.lineHeight,
          textAlign: 'center',
        }}
      >
        Fridgr app shell is in progress.
      </Text>
    </View>
  );
}
