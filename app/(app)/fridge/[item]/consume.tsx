/* eslint-disable react-native/no-inline-styles */

import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fridgeItemsQueryKey } from '@hooks/useFridgeItems';
import { useMe } from '@hooks/useMe';
import { appConfig } from '@lib/env';
import type { FridgeItem } from '@lib/fridgeClient';
import { useSessionStore } from '@stores/useSessionStore';

import { Button, EmptyState, Header } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

const displayQty = (item: FridgeItem): string => {
  if (item.base_unit === 'mass_mg') return `${item.quantity_base / 1000} ${item.unit_display}`;
  if (item.base_unit === 'volume_ml') return `${item.quantity_base} ${item.unit_display}`;
  return `${item.quantity_base} ${item.unit_display}`;
};

const toQuantityBase = (userQty: number, item: FridgeItem): number => {
  if (item.base_unit === 'mass_mg') return userQty * 1000;
  return userQty;
};

const maxUserQty = (item: FridgeItem): number => {
  if (item.base_unit === 'mass_mg') return item.quantity_base / 1000;
  return item.quantity_base;
};

export default function ConsumeScreen(): JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { item: itemId } = useLocalSearchParams<{ item: string }>();
  const meQuery = useMe();
  const householdId = meQuery.data?.households[0]?.id ?? '';
  const queryClient = useQueryClient();
  const fridgeItems = queryClient.getQueryData<readonly FridgeItem[]>(
    fridgeItemsQueryKey(householdId),
  );
  const fridgeItem = fridgeItems?.find((i) => i.id === itemId) ?? null;
  const session = useSessionStore((state) => state.session);

  const maxQty = fridgeItem ? maxUserQty(fridgeItem) : 0;
  const [qty, setQty] = useState<string>(String(maxQty));
  const [logToDiary, setLogToDiary] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedQty = parseFloat(qty);
  const isValidQty = !isNaN(parsedQty) && parsedQty >= 1 && parsedQty <= maxQty;

  const handleConfirm = async (): Promise<void> => {
    if (!fridgeItem || !isValidQty || !session?.access_token) return;

    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${appConfig.supabaseUrl}/functions/v1/fridge-items/households/${householdId}/fridge/items/${itemId}/consume`,
        {
          body: JSON.stringify({
            base_unit: fridgeItem.base_unit,
            quantity_base: toQuantityBase(parsedQty, fridgeItem),
          }),
          headers: {
            apikey: appConfig.supabaseAnonKey,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
          },
          method: 'POST',
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        const message = payload?.error?.message ?? 'Could not consume item. Please try again.';
        setErrorMessage(message);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: fridgeItemsQueryKey(householdId) });
      router.back();
    } catch {
      setErrorMessage('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsPending(false);
    }
  };

  if (meQuery.isLoading) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!fridgeItem) {
    return (
      <View
        style={{
          backgroundColor: theme.colors.background,
          flex: 1,
          padding: theme.spacing.lg,
        }}
      >
        <Header onBackPress={() => router.back()} title="Consume item" />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            actionLabel="Back to fridge"
            description="This item could not be found. It may have already been removed."
            onActionPress={() => router.back()}
            title="Item not found"
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          backgroundColor: theme.colors.background,
          flexGrow: 1,
          padding: theme.spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Header onBackPress={() => router.back()} title="Consume item" />

        <View style={{ gap: theme.spacing.xl, marginTop: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading.fontSize,
                fontWeight: theme.typography.heading.fontWeight,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            >
              {fridgeItem.snapshot.food_name}
            </Text>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.body.fontSize,
                fontWeight: theme.typography.body.fontWeight,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {`Available: ${displayQty(fridgeItem)}`}
            </Text>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.captionStrong.fontSize,
                fontWeight: theme.typography.captionStrong.fontWeight,
                lineHeight: theme.typography.captionStrong.lineHeight,
              }}
            >
              Quantity
            </Text>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.xl,
                borderWidth: theme.borderWidths.thin,
                flexDirection: 'row',
                minHeight: theme.componentSizes.input.minHeight,
                paddingHorizontal: theme.spacing.lg,
              }}
            >
              <TextInput
                accessibilityLabel="Quantity to consume"
                allowFontScaling
                keyboardType="numeric"
                onChangeText={(value) => {
                  setQty(value);
                  setErrorMessage(null);
                }}
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={{
                  color: theme.colors.text,
                  flex: 1,
                  fontSize: theme.typography.body.fontSize,
                  fontWeight: theme.typography.body.fontWeight,
                  lineHeight: theme.typography.body.lineHeight,
                  paddingVertical: theme.spacing.md,
                }}
                value={qty}
              />
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.caption.fontSize,
                  fontWeight: theme.typography.caption.fontWeight,
                  lineHeight: theme.typography.caption.lineHeight,
                }}
              >
                {fridgeItem.unit_display}
              </Text>
            </View>
          </View>

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.body.fontSize,
                fontWeight: theme.typography.body.fontWeight,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Log to diary
            </Text>
            <Switch
              onValueChange={(value) => setLogToDiary(value)}
              thumbColor={logToDiary ? theme.colors.primaryForeground : theme.colors.textMuted}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              value={logToDiary}
            />
          </View>

          {logToDiary ? (
            <Text
              allowFontScaling
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.caption.fontSize,
                fontWeight: theme.typography.caption.fontWeight,
                lineHeight: theme.typography.caption.lineHeight,
              }}
            >
              Diary logging coming soon
            </Text>
          ) : null}

          {errorMessage ? (
            <View
              accessibilityRole="alert"
              style={{
                backgroundColor: theme.colors.destructiveSoft,
                borderColor: theme.colors.destructive,
                borderRadius: theme.radii.lg,
                borderWidth: theme.borderWidths.thin,
                padding: theme.spacing.md,
              }}
            >
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.destructive,
                  fontSize: theme.typography.body.fontSize,
                  fontWeight: theme.typography.body.fontWeight,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Button
            disabled={!isValidQty}
            label="Confirm"
            loading={isPending}
            onPress={handleConfirm}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
