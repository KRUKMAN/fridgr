/* eslint-disable react-native/no-inline-styles */

import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { mapAuthError } from '@lib/authErrors';
import { supabase } from '@lib/supabase';

import { Button, Card, Input } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function SignUpScreen(): JSX.Element {
  const theme = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayNameError, setDisplayNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    const normalizedDisplayName = displayName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    let hasError = false;

    setDisplayNameError(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);
    setFormError(undefined);

    if (!normalizedDisplayName) {
      setDisplayNameError('Display name is required.');
      hasError = true;
    } else if (normalizedDisplayName.length > 50) {
      setDisplayNameError('Display name must be 50 characters or less.');
      hasError = true;
    }

    if (!normalizedEmail) {
      setEmailError('Email is required.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirm your password.');
      hasError = true;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: normalizedDisplayName,
          },
        },
      });

      if (error) {
        const details = mapAuthError(error);
        setEmailError(details.email);
        setPasswordError(details.password);
        setFormError(details.general);
        return;
      }

      if (!data.session) {
        setPendingConfirmationEmail(normalizedEmail);
      }
    } catch (error) {
      setFormError(mapAuthError(error).general);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingConfirmationEmail) {
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
                Check your inbox
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
                Confirm your email
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
                We sent a confirmation link to {pendingConfirmationEmail}. Once you verify your
                email, you can sign in and continue onboarding.
              </Text>
            </View>

            <Link asChild href="/(auth)/sign-in">
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
                  Back to sign in
                </Text>
              </Pressable>
            </Link>
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
              Fridgr
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
              Create your account
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
              Set up your Fridgr profile so you can create or join a household next.
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

          <View style={{ gap: theme.spacing.md }}>
            <Input
              accessibilityHint="Enter the display name other household members will see."
              autoCapitalize="words"
              autoComplete="name"
              errorText={displayNameError}
              label="Display name"
              onChangeText={(value) => {
                setDisplayName(value);
                if (displayNameError || formError) {
                  setDisplayNameError(undefined);
                  setFormError(undefined);
                }
              }}
              placeholder="Your name"
              returnKeyType="next"
              textContentType="name"
              value={displayName}
            />
            <Input
              accessibilityHint="Enter the email address for this account."
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              errorText={emailError}
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) => {
                setEmail(value);
                if (emailError || formError) {
                  setEmailError(undefined);
                  setFormError(undefined);
                }
              }}
              placeholder="you@example.com"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
            />
            <Input
              accessibilityHint="Create a password with at least 8 characters."
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              errorText={passwordError}
              label="Password"
              onChangeText={(value) => {
                setPassword(value);
                if (passwordError || formError) {
                  setPasswordError(undefined);
                  setFormError(undefined);
                }
              }}
              placeholder="At least 8 characters"
              returnKeyType="next"
              secureTextEntry
              textContentType="newPassword"
              value={password}
            />
            <Input
              accessibilityHint="Re-enter the same password to confirm it."
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              errorText={confirmPasswordError}
              label="Confirm password"
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (confirmPasswordError || formError) {
                  setConfirmPasswordError(undefined);
                  setFormError(undefined);
                }
              }}
              onSubmitEditing={() => {
                void handleSubmit();
              }}
              placeholder="Repeat your password"
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={confirmPassword}
            />
          </View>

          <Button
            label="Create account"
            loading={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
          />

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.xs,
              justifyContent: 'center',
            }}
          >
            <Text
              allowFontScaling
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.body.fontSize,
                fontWeight: theme.typography.body.fontWeight,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Already have an account?
            </Text>
            <Link asChild href="/(auth)/sign-in">
              <Pressable
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
                  }}
                >
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
