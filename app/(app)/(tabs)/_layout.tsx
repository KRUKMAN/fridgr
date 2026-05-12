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
        tabBarLabelStyle: {
          fontSize: theme.typography.micro.fontSize,
          fontWeight: theme.typography.micro.fontWeight,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.xxxl,
          borderTopColor: theme.colors.border,
          borderWidth: theme.borderWidths.thick,
          height: 76,
          marginBottom: theme.spacing.md,
          marginHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
          position: 'absolute',
          shadowColor: theme.colors.shadow,
          ...theme.shadows.sheet,
        },
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons
            color={route.name === 'cook' ? theme.colors.electricPink : color}
            name={getTabIcon(route.name, focused)}
            size={route.name === 'cook' ? size + 14 : size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="fridge" options={{ title: 'Fridge' }} />
      <Tabs.Screen name="cook" options={{ title: 'AI' }} />
      <Tabs.Screen name="diary" options={{ title: 'Diary' }} />
      <Tabs.Screen name="settings" options={{ title: 'You' }} />
    </Tabs>
  );
}

function getTabIcon(
  routeName: string,
  focused: boolean,
):
  | 'book'
  | 'book-outline'
  | 'home'
  | 'home-outline'
  | 'mic-circle'
  | 'mic-circle-outline'
  | 'person'
  | 'person-outline'
  | 'snow'
  | 'snow-outline' {
  switch (routeName) {
    case 'fridge':
      return focused ? 'snow' : 'snow-outline';
    case 'diary':
      return focused ? 'book' : 'book-outline';
    case 'cook':
      return focused ? 'mic-circle' : 'mic-circle-outline';
    case 'settings':
      return focused ? 'person' : 'person-outline';
    case 'index':
    default:
      return focused ? 'home' : 'home-outline';
  }
}
