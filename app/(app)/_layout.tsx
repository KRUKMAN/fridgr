import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@stores/useSessionStore';

import type React from 'react';

export default function AppLayout(): React.JSX.Element {
  const sessionStatus = useSessionStore((state) => state.status);

  if (sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
