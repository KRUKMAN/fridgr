import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function TabsLayout(): JSX.Element {
  const theme = useTheme();

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
