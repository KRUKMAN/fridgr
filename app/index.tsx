import { Redirect, type Href } from 'expo-router';

import { useSessionStore } from '@stores/useSessionStore';

import type { JSX } from 'react';

export default function IndexRoute(): JSX.Element | null {
  const sessionStatus = useSessionStore((state) => state.status);

  if (sessionStatus === 'loading') {
    return null;
  }

  if (sessionStatus === 'authenticated') {
    return <Redirect href={'/(app)/onboarding/create-household' as Href} />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
