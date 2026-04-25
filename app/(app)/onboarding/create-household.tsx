/* eslint-disable react-native/no-inline-styles */

import * as Clipboard from 'expo-clipboard';
import { Link, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  HouseholdMutationError,
  getHouseholdFieldError,
  useCreateHouseholdMutation,
} from '@hooks/useHouseholdMutations';

import { Button, Card, Input, useToast } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

const copyInviteCode = async (inviteCode: string): Promise<boolean> => {
  await Clipboard.setStringAsync(inviteCode);
  return true;
};

const getCreateFormError = (error: HouseholdMutationError | null): string | undefined => {
  if (!error) {
    return undefined;
  }

  if (error.status === 401) {
    return 'Your session expired. Please sign in again.';
  }

  if (error.code === 'validation_failed' || error.code === 'validation_error') {
    return undefined;
  }

  return error.message;
};

export default function CreateHouseholdScreen(): JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const { clearError, completeOnboarding, createHousehold, createdHousehold, error, isPending } =
    useCreateHouseholdMutation();

  const formError = useMemo(() => getCreateFormError(error), [error]);
  const canCopyInviteCode = true;

  const handleSubmit = async (): Promise<void> => {
    const normalizedName = name.trim();

    setNameError(undefined);
    clearError();

    if (!normalizedName) {
      setNameError('Household name is required.');
      return;
    }

    if (normalizedName.length > 50) {
      setNameError('Household name must be 50 characters or less.');
      return;
    }

    try {
      await createHousehold(normalizedName);
    } catch (caughtError) {
      const resolvedError = caughtError instanceof HouseholdMutationError ? caughtError : error;
      const validationError = getHouseholdFieldError(resolvedError ?? null, 'name');

      if (validationError) {
        setNameError(validationError);
      }
    }
  };

  const handleContinue = async (): Promise<void> => {
    await completeOnboarding();
    router.replace('/(app)/(tabs)' as Href);
  };

  const handleCopyInviteCode = async (): Promise<void> => {
    if (!createdHousehold?.invite_code) {
      return;
    }

    try {
      const copied = await copyInviteCode(createdHousehold.invite_code);

      if (!copied) {
        showToast({
          message: 'Clipboard support is not available on this device yet.',
          title: 'Copy unavailable',
          variant: 'info',
        });
        return;
      }

      showToast({
        message: 'Share this code with the next person joining your household.',
        title: 'Invite code copied',
        variant: 'success',
      });
    } catch {
      showToast({
        message: 'We could not copy that invite code. You can still share it manually.',
        title: 'Copy failed',
        variant: 'error',
      });
    }
  };

  if (createdHousehold) {
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
        >
          <Card
            padding="lg"
            variant="hero"
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
                  color: theme.colors.success,
                  fontSize: theme.typography.captionStrong.fontSize,
                  fontWeight: theme.typography.captionStrong.fontWeight,
                  letterSpacing: 1.2,
                  lineHeight: theme.typography.captionStrong.lineHeight,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                Household created
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
                {createdHousehold.household.name}
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
                Your household is ready. Save the invite code now so someone else can join later.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.colors.primarySoft,
                borderColor: theme.colors.primary,
                borderRadius: theme.radii.xl,
                borderWidth: theme.borderWidths.thin,
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
              }}
            >
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.captionStrong.fontSize,
                  fontWeight: theme.typography.captionStrong.fontWeight,
                  lineHeight: theme.typography.captionStrong.lineHeight,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                Invite code
              </Text>
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.text,
                  fontSize: theme.typography.display.fontSize,
                  fontWeight: theme.typography.display.fontWeight,
                  letterSpacing: 4,
                  lineHeight: theme.typography.display.lineHeight,
                  textAlign: 'center',
                }}
              >
                {createdHousehold.invite_code ?? 'Unavailable'}
              </Text>
            </View>

            <View style={{ gap: theme.spacing.md }}>
              {canCopyInviteCode && createdHousehold.invite_code ? (
                <Button
                  label="Copy invite code"
                  onPress={handleCopyInviteCode}
                  variant="secondary"
                />
              ) : null}
              <Button label="Continue to Fridgr" onPress={handleContinue} />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          variant="hero"
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
              Household fridge
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
              Create your household
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
              Start with a name. Fridgr will make an invite code once your household is created.
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
            accessibilityHint="Enter the name your household will use in Fridgr."
            autoCapitalize="words"
            errorText={nameError}
            label="Household name"
            maxLength={50}
            onChangeText={(value) => {
              setName(value);
              if (nameError || error) {
                setNameError(undefined);
                clearError();
              }
            }}
            placeholder="Krukman home"
            returnKeyType="done"
            value={name}
          />

          <View style={{ gap: theme.spacing.md }}>
            <Button label="Create household" loading={isPending} onPress={handleSubmit} />
            <Link asChild href={'/(app)/onboarding/join-household' as Href}>
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
                  Already have an invite code?
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
