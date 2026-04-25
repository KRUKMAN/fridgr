import { Redirect, Stack, type Href } from 'expo-router';

import { useSessionStore } from '@stores/useSessionStore';

import type React from 'react';

export default function AuthLayout(): React.JSX.Element | null {
  const sessionStatus = useSessionStore((state) => state.status);

  if (sessionStatus === 'loading') {
    return null;
  }

  if (sessionStatus === 'authenticated') {
    return <Redirect href={'/(app)/(tabs)' as Href} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
