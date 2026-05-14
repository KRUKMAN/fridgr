/* eslint-disable react-native/no-inline-styles */

import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { useFridgeItems } from '@hooks/useFridgeItems';
import { useMe } from '@hooks/useMe';
import type { FridgeItem } from '@lib/fridgeClient';

import { Button, EmptyState, ExpiryIndicator } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function FridgeTab(): JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const meQuery = useMe();
  const householdId = meQuery.data?.households[0]?.id ?? '';
  const fridgeQuery = useFridgeItems(householdId);

  const onRefresh = useCallback(() => {
    void fridgeQuery.refetch();
  }, [fridgeQuery]);

  if (fridgeQuery.isLoading || meQuery.isLoading) {
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

  return (
    <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
      <FlatList
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
        ListEmptyComponent={
          fridgeQuery.isError ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <EmptyState
                actionLabel="Retry"
                description={fridgeQuery.error?.message ?? 'Could not load fridge items.'}
                onActionPress={onRefresh}
                title="Something went wrong"
              />
            </View>
          ) : (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <EmptyState
                actionLabel="Add item"
                description="Add your first item to track what's in the shared fridge."
                onActionPress={() => {
                  router.push('/(app)/fridge/add' as Href);
                }}
                title="Fridge is empty"
              />
            </View>
          )
        }
        ListHeaderComponent={
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: theme.spacing.md,
              paddingBottom: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.xl,
            }}
          >
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                flex: 1,
                fontSize: theme.typography.title.fontSize,
                fontWeight: theme.typography.title.fontWeight,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Fridge
            </Text>
            <Button
              accessibilityLabel="Add fridge item"
              fullWidth={false}
              iconLeft={<Ionicons color={theme.colors.primaryForeground} name="add" size={18} />}
              label="Add"
              onPress={() => {
                router.push('/(app)/fridge/add' as Href);
              }}
              size="sm"
            />
          </View>
        }
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        data={fridgeQuery.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={onRefresh}
            refreshing={fridgeQuery.isRefetching}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => <FridgeItemRow item={item} />}
      />
    </View>
  );
}

function FridgeItemRow({ item }: Readonly<{ item: FridgeItem }>): JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const itemPath = `/(app)/fridge/${item.id}` as const;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.xl,
        borderWidth: theme.borderWidths.thin,
        marginHorizontal: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text
            allowFontScaling
            numberOfLines={1}
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.bodyStrong.fontSize,
              fontWeight: theme.typography.bodyStrong.fontWeight,
              lineHeight: theme.typography.bodyStrong.lineHeight,
            }}
          >
            {item.snapshot.food_name}
          </Text>

          <Text
            allowFontScaling
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.typography.caption.fontSize,
              fontWeight: theme.typography.caption.fontWeight,
              lineHeight: theme.typography.caption.lineHeight,
            }}
          >
            {item.unit_display}
            {item.snapshot.category ? ` - ${item.snapshot.category}` : ''}
          </Text>

          <View style={{ marginTop: theme.spacing.xxs }}>
            <ExpiryIndicator compact date={item.estimated_expiry} />
          </View>
        </View>

        <View
          style={{
            alignItems: 'flex-end',
            gap: theme.spacing.sm,
            justifyContent: 'space-between',
          }}
        >
          <QuickActionButton
            accessibilityLabel={`Consume ${item.snapshot.food_name}`}
            iconName="checkmark-circle-outline"
            onPress={() => {
              router.push(`${itemPath}/consume` as Href);
            }}
            tint={theme.colors.secondary}
          />
          <QuickActionButton
            accessibilityLabel={`Waste ${item.snapshot.food_name}`}
            iconName="trash-outline"
            onPress={() => {
              router.push(`${itemPath}/waste` as Href);
            }}
            tint={theme.colors.destructive}
          />
          <QuickActionButton
            accessibilityLabel={`Edit ${item.snapshot.food_name}`}
            iconName="pencil-outline"
            onPress={() => {
              router.push(`${itemPath}/edit` as Href);
            }}
            tint={theme.colors.textMuted}
          />
        </View>
      </View>
    </View>
  );
}

function QuickActionButton({
  accessibilityLabel,
  iconName,
  onPress,
  tint,
}: Readonly<{
  accessibilityLabel: string;
  iconName: 'checkmark-circle-outline' | 'pencil-outline' | 'trash-outline';
  onPress: () => void;
  tint: string;
}>): JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={theme.spacing.sm}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? theme.opacities.pressed : 1,
      })}
    >
      <Ionicons color={tint} name={iconName} size={theme.iconSizes.md} />
    </Pressable>
  );
}
