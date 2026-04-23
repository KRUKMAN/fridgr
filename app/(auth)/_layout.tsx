import { Stack } from 'expo-router';

import type React from 'react';

export default function AuthLayout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
