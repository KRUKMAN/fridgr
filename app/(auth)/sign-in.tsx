/* eslint-disable react-native/no-inline-styles */

import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { mapAuthError } from '@lib/authErrors';
import { supabase } from '@lib/supabase';

import { Button, Card, Input, useToast } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function SignInScreen(): JSX.Element {
  const theme = useTheme();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    let hasError = false;

    setEmailError(undefined);
    setPasswordError(undefined);
    setFormError(undefined);

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

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const details = mapAuthError(error);
        setEmailError(details.email);
        setPasswordError(details.password);
        setFormError(details.general);
      }
    } catch (error) {
      setFormError(mapAuthError(error).general);
    } finally {
      setIsSubmitting(false);
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
              Welcome back
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
              Sign in to pick up where your household left off.
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
              accessibilityHint="Enter the email address you use for Fridgr."
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
              accessibilityHint="Enter your Fridgr password."
              autoCapitalize="none"
              autoComplete="password"
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
              onSubmitEditing={() => {
                void handleSubmit();
              }}
              placeholder="Enter your password"
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={password}
            />
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label="Sign in"
              loading={isSubmitting}
              onPress={() => {
                void handleSubmit();
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                showToast({
                  message: 'Coming soon',
                  title: 'Forgot password',
                  variant: 'info',
                });
              }}
              style={({ pressed }) => ({
                opacity: pressed ? theme.opacities.pressed : 1,
                paddingVertical: theme.spacing.xs,
              })}
            >
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.info,
                  fontSize: theme.typography.body.fontSize,
                  fontWeight: theme.typography.body.fontWeight,
                  lineHeight: theme.typography.body.lineHeight,
                  textAlign: 'center',
                }}
              >
                Forgot your password?
              </Text>
            </Pressable>
          </View>

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
              Need an account?
            </Text>
            <Link asChild href="/(auth)/sign-up">
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
                  Create one
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
