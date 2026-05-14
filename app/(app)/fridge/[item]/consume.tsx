/* eslint-disable react-native/no-inline-styles */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, Header } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function ConsumeFridgeItemScreen(): JSX.Element {
  const { item } = useLocalSearchParams<{ item: string }>();
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
      <Header onBackPress={router.back} title="Consume item" />
      <EmptyState
        actionLabel="Back to fridge"
        description={`Consume flow for item ${item ?? ''} is not ready yet. This placeholder keeps the quick action explicit instead of silent.`}
        onActionPress={router.back}
        title="Consume flow coming next"
      />
    </View>
  );
}
