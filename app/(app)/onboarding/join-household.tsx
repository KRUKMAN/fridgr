/* eslint-disable react-native/no-inline-styles */

import { Link, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  HouseholdMutationError,
  getHouseholdFieldError,
  useJoinHouseholdMutation,
} from '@hooks/useHouseholdMutations';

import { Button, Card, Input } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

const getJoinFormError = (error: HouseholdMutationError | null): string | undefined => {
  if (!error) {
    return undefined;
  }

  switch (error.code) {
    case 'already_member':
      return 'You are already a member of that household.';
    case 'unauthorized':
      return 'Your session expired. Please sign in again.';
    case 'validation_error':
    case 'validation_failed':
    case 'not_found':
      return undefined;
    default:
      return error.message;
  }
};

export default function JoinHouseholdScreen(): JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState<string | undefined>(undefined);
  const { clearError, error, isPending, joinHousehold } = useJoinHouseholdMutation();

  const formError = useMemo(() => getJoinFormError(error), [error]);

  const handleSubmit = async (): Promise<void> => {
    const normalizedInviteCode = inviteCode.trim().toUpperCase();

    setInviteCodeError(undefined);
    clearError();

    if (!normalizedInviteCode) {
      setInviteCodeError('Invite code is required.');
      return;
    }

    if (normalizedInviteCode.length !== 8) {
      setInviteCodeError('Invite codes are 8 characters long.');
      return;
    }

    try {
      await joinHousehold(normalizedInviteCode);
      router.replace('/(app)/(tabs)' as Href);
    } catch (caughtError) {
      const resolvedError = caughtError instanceof HouseholdMutationError ? caughtError : error;
      const validationError = getHouseholdFieldError(resolvedError ?? null, 'invite_code');

      if (resolvedError?.code === 'not_found') {
        setInviteCodeError('That invite code was not found.');
        return;
      }

      if (validationError) {
        setInviteCodeError(validationError);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flexGrow: 1,
          justifyContent: 'center',
          padding: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card
          padding="lg"
          style={{
            gap: theme.spacing.lg,
            maxWidth: 440,
            width: '100%',
          }}
        >
          <View style={{ gap: theme.spacing.sm }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.captionStrong.fontSize,
                fontWeight: theme.typography.captionStrong.fontWeight,
                letterSpacing: 1.2,
                lineHeight: theme.typography.captionStrong.lineHeight,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              Household setup
            </Text>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.display.fontSize,
                fontWeight: theme.typography.display.fontWeight,
                lineHeight: theme.typography.display.lineHeight,
                textAlign: 'center',
              }}
            >
              Join with an invite code
            </Text>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.body.fontSize,
                fontWeight: theme.typography.body.fontWeight,
                lineHeight: theme.typography.body.lineHeight,
                textAlign: 'center',
              }}
            >
              Paste the 8-character code from your household owner. We will normalize it to
              uppercase.
            </Text>
          </View>

          {formError ? (
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
                {formError}
              </Text>
            </View>
          ) : null}

          <Input
            accessibilityHint="Enter the invite code exactly as it was shared with you."
            autoCapitalize="characters"
            autoCorrect={false}
            errorText={inviteCodeError}
            label="Invite code"
            maxLength={8}
            onChangeText={(value) => {
              const normalizedValue = value.replace(/[^a-zA-Z2-9]/g, '').toUpperCase();
              setInviteCode(normalizedValue);

              if (inviteCodeError || error) {
                setInviteCodeError(undefined);
                clearError();
              }
            }}
            placeholder="ABCD2345"
            returnKeyType="done"
            value={inviteCode}
          />

          <View style={{ gap: theme.spacing.md }}>
            <Button label="Join household" loading={isPending} onPress={handleSubmit} />
            <Link asChild href={'/(app)/onboarding/create-household' as Href}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => ({
                  opacity: pressed ? theme.opacities.pressed : 1,
                })}
              >
                <Text
                  allowFontScaling
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.typography.bodyStrong.fontSize,
                    fontWeight: theme.typography.bodyStrong.fontWeight,
                    lineHeight: theme.typography.bodyStrong.lineHeight,
                    textAlign: 'center',
                  }}
                >
                  Need to create a household instead?
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
