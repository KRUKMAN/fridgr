/* eslint-disable react-native/no-inline-styles */

import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@lib/supabase';
import { useSessionStore } from '@stores/useSessionStore';

import { FridgrBottomSheetProvider, Spinner, ToastProvider } from '@components';
import { ensureDatabaseReady } from '@db/client';
import { ThemeProvider, useTheme } from '@theme';

import type { JSX } from 'react';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FridgrBottomSheetProvider>
            <ToastProvider>
              <AppBootstrap />
            </ToastProvider>
          </FridgrBottomSheetProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppBootstrap(): JSX.Element {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const sessionStatus = useSessionStore((state) => state.status);
  const setAuthenticated = useSessionStore((state) => state.setAuthenticated);
  const setLoading = useSessionStore((state) => state.setLoading);
  const setUnauthenticated = useSessionStore((state) => state.setUnauthenticated);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async (): Promise<void> => {
      setLoading();

      try {
        await ensureDatabaseReady();

        if (isMounted) {
          setIsDatabaseReady(true);
        }
      } catch (error) {
        if (isMounted) {
          setDatabaseError(
            error instanceof Error ? error.message : 'Local database bootstrap failed.',
          );
        }
      }

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (initialSession) {
        setAuthenticated(initialSession);
      } else {
        setUnauthenticated();
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        setAuthenticated(nextSession);
        return;
      }

      setUnauthenticated();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthenticated, setLoading, setUnauthenticated]);

  useEffect(() => {
    if (!isDatabaseReady || sessionStatus === 'loading') {
      return;
    }

    void SplashScreen.hideAsync().catch(() => undefined);
  }, [isDatabaseReady, sessionStatus]);

  if (databaseError) {
    return (
      <BootstrapMessage message={databaseError} title="Database bootstrap failed" variant="error" />
    );
  }

  if (!isDatabaseReady || sessionStatus === 'loading') {
    return <BootstrapMessage message="Preparing Fridgr..." title="Loading" variant="loading" />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

function BootstrapMessage({
  message,
  title,
  variant,
}: Readonly<{
  message: string;
  title: string;
  variant: 'error' | 'loading';
}>): JSX.Element {
  const theme = useTheme();

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
      {variant === 'loading' ? <Spinner size="large" /> : null}
      <Text
        allowFontScaling
        style={{
          color: variant === 'error' ? theme.colors.destructive : theme.colors.text,
          fontSize: theme.typography.heading.fontSize,
          fontWeight: theme.typography.heading.fontWeight,
          lineHeight: theme.typography.heading.lineHeight,
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
        {message}
      </Text>
    </View>
  );
}
