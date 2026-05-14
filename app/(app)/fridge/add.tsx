/* eslint-disable react-native/no-inline-styles */

import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, Header } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function AddFridgeItemScreen(): JSX.Element {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        flex: 1,
        gap: theme.spacing.xl,
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
      }}
    >
      <Header onBackPress={router.back} title="Add item" />
      <EmptyState
        actionLabel="Back to fridge"
        description="Manual fridge item entry is the next Wave 3 screen. The list no longer leaves this action silent."
        onActionPress={router.back}
        title="Add flow coming next"
      />
    </View>
  );
}
