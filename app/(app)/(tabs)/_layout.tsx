import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, type Href } from 'expo-router';

import { useMe } from '@hooks/useMe';

import { useTheme } from '@theme';

import type React from 'react';

export default function TabsLayout(): React.JSX.Element | null {
  const theme = useTheme();
  const meQuery = useMe();

  if (meQuery.isLoading) {
    return null;
  }

  if (meQuery.error?.status === 401) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if ((meQuery.data?.households.length ?? 0) === 0) {
    return <Redirect href={'/(app)/onboarding/create-household' as Href} />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons color={color} name={getTabIcon(route.name)} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="fridge" options={{ title: 'Fridge' }} />
      <Tabs.Screen name="diary" options={{ title: 'Diary' }} />
      <Tabs.Screen name="cook" options={{ title: 'Cook' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function getTabIcon(
  routeName: string,
): 'book-outline' | 'home-outline' | 'person-outline' | 'restaurant-outline' | 'snow-outline' {
  switch (routeName) {
    case 'fridge':
      return 'snow-outline';
    case 'diary':
      return 'book-outline';
    case 'cook':
      return 'restaurant-outline';
    case 'profile':
      return 'person-outline';
    case 'index':
    default:
      return 'home-outline';
  }
}
