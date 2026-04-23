/* eslint-disable react-native/no-inline-styles */

import 'react-native-gesture-handler';

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FridgrBottomSheetProvider, Spinner, ToastProvider } from '@components';
import { ensureDatabaseReady } from '@db/client';
import { ThemeProvider, useTheme } from '@theme';

import type { JSX, PropsWithChildren } from 'react';

export default function RootLayout(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FridgrBottomSheetProvider>
            <ToastProvider>
              <DatabaseBootstrap>
                <Slot />
                <StatusBar style="auto" />
              </DatabaseBootstrap>
            </ToastProvider>
          </FridgrBottomSheetProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function DatabaseBootstrap({ children }: PropsWithChildren): JSX.Element {
  const theme = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async (): Promise<void> => {
      try {
        await ensureDatabaseReady();

        if (!isMounted) {
          return;
        }

        setIsReady(true);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Local database bootstrap failed.',
        );
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  if (errorMessage) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          gap: theme.spacing.md,
          justifyContent: 'center',
          padding: theme.spacing.xl,
        }}
      >
        <Text
          allowFontScaling
          style={{
            color: theme.colors.destructive,
            fontSize: theme.typography.heading.fontSize,
            fontWeight: theme.typography.heading.fontWeight,
            lineHeight: theme.typography.heading.lineHeight,
            textAlign: 'center',
          }}
        >
          Database bootstrap failed
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
          {errorMessage}
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          gap: theme.spacing.md,
          justifyContent: 'center',
          padding: theme.spacing.xl,
        }}
      >
        <Spinner size="large" />
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
          Preparing local database…
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
