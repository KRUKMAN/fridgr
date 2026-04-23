/* eslint-disable react-native/no-inline-styles */

import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useMe } from '@hooks/useMe';
import { useSignOut } from '@hooks/useSignOut';
import { useSessionStore } from '@stores/useSessionStore';

import { Button, Card, Spinner, useToast } from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

export default function ProfileTab(): JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const { showToast } = useToast();
  const meQuery = useMe();
  const session = useSessionStore((state) => state.session);
  const { error, isPending, resetError, signOut } = useSignOut();

  const handleSignOut = async (): Promise<void> => {
    resetError();

    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch {
      showToast({
        message: 'Please try again in a moment.',
        title: 'Sign out failed',
        variant: 'error',
      });
    }
  };

  if (meQuery.isLoading) {
    return <Spinner />;
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.xl,
      }}
    >
      <Card
        padding="lg"
        style={{
          gap: theme.spacing.lg,
          marginHorizontal: 'auto',
          maxWidth: 440,
          width: '100%',
        }}
      >
        <View style={{ gap: theme.spacing.sm }}>
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
            Profile
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
            Household settings land in the next ticket. For now, you can safely sign out here.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.xl,
            borderWidth: theme.borderWidths.thin,
            gap: theme.spacing.sm,
            padding: theme.spacing.lg,
          }}
        >
          <Text
            allowFontScaling
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.title.fontSize,
              fontWeight: theme.typography.title.fontWeight,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            {meQuery.data?.user.display_name ?? 'Fridgr member'}
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
            {meQuery.data?.user.email ?? session?.user.email ?? 'Signed in'}
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
            Active households: {meQuery.data?.households.length ?? 0}
          </Text>
        </View>

        {error ? (
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
              {error.message}
            </Text>
          </View>
        ) : null}

        <Button
          label="Sign out"
          loading={isPending}
          onPress={handleSignOut}
          variant="destructive"
        />
      </Card>
    </View>
  );
}
