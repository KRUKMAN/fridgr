/* eslint-disable react-native/no-inline-styles */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Divider,
  EmptyState,
  Header,
  IconButton,
  Input,
  ListItem,
  MemberList,
  Modal,
  Spinner,
  useToast,
} from '@components';
import { runLocalRoundtrip } from '@db/client';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export function ComponentDemoRoute(): JSX.Element {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [roundtripSummary, setRoundtripSummary] = useState<string | null>(null);
  const [isRoundtripRunning, setIsRoundtripRunning] = useState(false);
  const theme = useTheme();
  const { showToast } = useToast();

  const iconColor = useMemo(() => theme.colors.primary, [theme.colors.primary]);
  const mockMembers = useMemo(
    () => [
      {
        avatar_url: null,
        display_name: 'Maria Kowalska',
        joined_at: '2026-04-18T10:00:00.000Z',
        role: 'owner' as const,
        user_id: 'user-owner',
      },
      {
        avatar_url: null,
        display_name: 'Alicja Zielinska',
        joined_at: '2026-04-19T11:15:00.000Z',
        role: 'member' as const,
        user_id: 'user-member-a',
      },
      {
        avatar_url: null,
        display_name: 'Jakub Nowak',
        joined_at: '2026-04-20T08:30:00.000Z',
        role: 'member' as const,
        user_id: 'user-member-b',
      },
    ],
    [],
  );

  if (!__DEV__) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          justifyContent: 'center',
          padding: theme.spacing.xl,
        }}
      >
        <Text
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.body.fontSize,
            fontWeight: theme.typography.body.fontWeight,
            lineHeight: theme.typography.body.lineHeight,
            textAlign: 'center',
          }}
        >
          Component previews are only available in development builds.
        </Text>
      </View>
    );
  }

  const handleRoundtripPress = async (): Promise<void> => {
    setIsRoundtripRunning(true);

    try {
      const result = await runLocalRoundtrip();

      setRoundtripSummary(
        `Inserted ${result.householdName} and confirmed ${result.householdCount} total local household row(s).`,
      );
      showToast({
        message: 'Expo SQLite and Drizzle are wired and writing locally.',
        title: 'Roundtrip passed',
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Local DB roundtrip failed.';

      setRoundtripSummary(message);
      showToast({
        message,
        title: 'Roundtrip failed',
        variant: 'error',
      });
    } finally {
      setIsRoundtripRunning(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        flex: 1,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
        }}
      >
        <Header
          right={
            <IconButton
              accessibilityLabel="Show info toast"
              icon="sparkles"
              onPress={() =>
                showToast({
                  message: 'Tokens and primitives are live in this preview.',
                  title: 'Design system',
                  variant: 'info',
                })
              }
              variant="ghost"
            />
          }
          subtitle="Light and dark mode should both render cleanly."
          title="Component Preview"
        />

        <Card padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading.fontSize,
                fontWeight: theme.typography.heading.fontWeight,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            >
              Buttons
            </Text>
            <View style={{ gap: theme.spacing.sm }}>
              <Button label="Primary action" />
              <Button label="Secondary action" variant="secondary" />
              <Button label="Destructive action" variant="destructive" />
              <Button label="Ghost action" variant="ghost" />
              <Button label="Loading state" loading />
            </View>
          </View>
        </Card>

        <Card padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading.fontSize,
                fontWeight: theme.typography.heading.fontWeight,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            >
              Inputs
            </Text>
            <Input
              helperText="Manual entry stays on-brand and accessible."
              label="Food name"
              onChangeText={setInputValue}
              placeholder="Greek yogurt"
              value={inputValue}
            />
            <Input
              errorText="Passwords must be at least 8 characters."
              label="Password"
              placeholder="Secure password"
              rightAdornment={
                <IconButton
                  accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  icon={passwordVisible ? 'eye-off' : 'eye'}
                  onPress={() => setPasswordVisible((current) => !current)}
                  size="sm"
                  variant="ghost"
                />
              }
              secureTextEntry={!passwordVisible}
            />
          </View>
        </Card>

        <Card padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading.fontSize,
                fontWeight: theme.typography.heading.fontWeight,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            >
              Lists and identity
            </Text>
            <ListItem
              left={<Avatar name="Maria Kowalska" />}
              right={
                <Text
                  allowFontScaling
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.typography.caption.fontSize,
                    fontWeight: theme.typography.caption.fontWeight,
                    lineHeight: theme.typography.caption.lineHeight,
                  }}
                >
                  Owner
                </Text>
              }
              subtitle="Joined 2 days ago"
              title="Main household"
            />
            <Divider />
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Avatar name="Maria Kowalska" size="sm" />
              <Avatar name="Jakub Nowak" size="md" />
              <Avatar name="Alicja Zielinska" size="lg" />
            </View>
            <MemberList
              currentUserId="user-owner"
              currentUserRole="owner"
              members={mockMembers}
              onRemoveMember={(userId) =>
                showToast({
                  message: `Mock remove triggered for ${userId}.`,
                  title: 'Member action',
                  variant: 'info',
                })
              }
            />
          </View>
        </Card>

        <Card padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading.fontSize,
                fontWeight: theme.typography.heading.fontWeight,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            >
              Feedback
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <IconButton
                accessibilityLabel="Show success toast"
                icon="checkmark"
                onPress={() =>
                  showToast({
                    message: 'Household invite sent successfully.',
                    title: 'Success',
                    variant: 'success',
                  })
                }
                variant="primary"
              />
              <IconButton
                accessibilityLabel="Open modal preview"
                icon="albums"
                onPress={() => setIsModalVisible(true)}
              />
              <IconButton
                accessibilityLabel="Open bottom sheet preview"
                icon="menu"
                onPress={() => setIsBottomSheetVisible(true)}
              />
            </View>
            <Spinner />
          </View>
        </Card>

        <Card padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading.fontSize,
                fontWeight: theme.typography.heading.fontWeight,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            >
              Local database
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
              This runs the Expo SQLite + Drizzle insert/select roundtrip requested in the Batch 1
              ticket.
            </Text>
            <Button
              label="Run local DB roundtrip"
              loading={isRoundtripRunning}
              onPress={() => {
                void handleRoundtripPress();
              }}
              variant="secondary"
            />
            {roundtripSummary ? (
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.text,
                  fontSize: theme.typography.caption.fontSize,
                  fontWeight: theme.typography.caption.fontWeight,
                  lineHeight: theme.typography.caption.lineHeight,
                }}
              >
                {roundtripSummary}
              </Text>
            ) : null}
          </View>
        </Card>

        <EmptyState
          actionLabel="Create household"
          description="Once the auth and onboarding batches land, this pattern can be reused for empty household and fridge states."
          icon={<Ionicons color={iconColor} name="home-outline" size={theme.iconSizes.xl} />}
          onActionPress={() =>
            showToast({
              message: 'CTA wiring is ready for the onboarding flow.',
              title: 'Placeholder action',
              variant: 'info',
            })
          }
          title="No household yet"
        />
      </ScrollView>

      <Modal
        onClose={() => setIsModalVisible(false)}
        subtitle="Built with React Native Modal plus token-driven animation and spacing."
        title="Modal preview"
        visible={isModalVisible}
      >
        <View style={{ gap: theme.spacing.md }}>
          <Text
            allowFontScaling
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.body.fontSize,
              fontWeight: theme.typography.body.fontWeight,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            This modal dismisses on backdrop tap and uses the same tokens as every other primitive.
          </Text>
          <Button label="Close" onPress={() => setIsModalVisible(false)} />
        </View>
      </Modal>

      <BottomSheet
        onClose={() => setIsBottomSheetVisible(false)}
        subtitle="Gorhom wrapper, themed handle, and token-based content spacing."
        title="Bottom sheet preview"
        visible={isBottomSheetVisible}
      >
        <View style={{ gap: theme.spacing.md }}>
          <Text
            allowFontScaling
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.body.fontSize,
              fontWeight: theme.typography.body.fontWeight,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            This wrapper is ready for action pickers and household/member management flows.
          </Text>
          <Button
            label="Dismiss sheet"
            onPress={() => setIsBottomSheetVisible(false)}
            variant="secondary"
          />
        </View>
      </BottomSheet>
    </View>
  );
}
