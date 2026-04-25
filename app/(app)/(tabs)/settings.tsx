/* eslint-disable react-native/no-inline-styles */

import * as Clipboard from 'expo-clipboard';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useHousehold } from '@hooks/useHousehold';
import {
  useLeaveHouseholdMutation,
  useRotateInviteMutation,
  useUpdateHouseholdMutation,
} from '@hooks/useHouseholdSettingsMutations';
import { useMe } from '@hooks/useMe';
import { useSignOut } from '@hooks/useSignOut';
import { useSessionStore } from '@stores/useSessionStore';

import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Divider,
  Header,
  IconButton,
  Input,
  ListItem,
  MemberList,
  Spinner,
  useToast,
} from '@components';
import { useTheme } from '@theme';

import type { JSX } from 'react';

type SelectedHousehold = Readonly<{
  id: string;
  name: string;
  role: 'member' | 'owner';
}>;

export default function SettingsTab(): JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const { showToast } = useToast();
  const meQuery = useMe();
  const session = useSessionStore((state) => state.session);
  const { error: signOutError, isPending: isSigningOut, resetError, signOut } = useSignOut();
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [householdNameDraft, setHouseholdNameDraft] = useState('');
  const [householdNameError, setHouseholdNameError] = useState<string | undefined>(undefined);
  const [isRotateSheetVisible, setIsRotateSheetVisible] = useState(false);
  const [isLeaveSheetVisible, setIsLeaveSheetVisible] = useState(false);

  const households = useMemo(() => meQuery.data?.households ?? [], [meQuery.data?.households]);
  const selectedHousehold = useMemo<SelectedHousehold | null>(
    () =>
      (selectedHouseholdId
        ? households.find((household) => household.id === selectedHouseholdId)
        : undefined) ??
      households[0] ??
      null,
    [households, selectedHouseholdId],
  );
  const householdId = selectedHousehold?.id ?? '';
  const householdQuery = useHousehold(householdId);
  const updateHouseholdMutation = useUpdateHouseholdMutation(householdId);
  const rotateInviteMutation = useRotateInviteMutation(householdId);
  const leaveHouseholdMutation = useLeaveHouseholdMutation(householdId);

  const canSwitchHouseholds = households.length > 1;
  const isOwner = selectedHousehold?.role === 'owner';

  const memberListMembers = useMemo(
    () =>
      (householdQuery.data?.members ?? []).map((member) => ({
        avatar_url: member.avatar_url,
        display_name: member.display_name ?? 'Household member',
        joined_at: member.joined_at,
        role: member.role,
        user_id: member.user_id,
      })),
    [householdQuery.data?.members],
  );

  const handleCopyInviteCode = async (): Promise<void> => {
    const resolvedInviteCode =
      rotateInviteMutation.data?.invite_code ?? householdQuery.data?.household.invite_code ?? null;

    if (!resolvedInviteCode) {
      showToast({
        message: 'Refresh this household and try again.',
        title: 'Invite code unavailable',
        variant: 'info',
      });
      return;
    }

    try {
      await Clipboard.setStringAsync(resolvedInviteCode);
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

  const persistHouseholdName = async (): Promise<void> => {
    const normalizedName = householdNameDraft.trim();

    if (!selectedHousehold || normalizedName === selectedHousehold.name) {
      setIsEditingName(false);
      setHouseholdNameError(undefined);
      updateHouseholdMutation.clearError();
      return;
    }

    if (!normalizedName) {
      setHouseholdNameError('Household name is required.');
      return;
    }

    if (normalizedName.length > 50) {
      setHouseholdNameError('Household name must be 50 characters or less.');
      return;
    }

    setHouseholdNameError(undefined);
    updateHouseholdMutation.clearError();

    try {
      await updateHouseholdMutation.submit(normalizedName);
      setIsEditingName(false);
      showToast({
        message: 'Everyone in this household will see the new name.',
        title: 'Household updated',
        variant: 'success',
      });
    } catch {
      const fieldError = updateHouseholdMutation.fieldError('name');

      setHouseholdNameError(fieldError ?? 'We could not save that household name.');
    }
  };

  const handleRotateInviteCode = async (): Promise<void> => {
    rotateInviteMutation.clearError();

    try {
      await rotateInviteMutation.submit();
      setIsRotateSheetVisible(false);
      showToast({
        message: 'The previous invite code stopped working immediately.',
        title: 'New invite code generated',
        variant: 'success',
      });
    } catch {
      showToast({
        message: rotateInviteMutation.error?.message ?? 'Please try again in a moment.',
        title: 'Invite rotation failed',
        variant: 'error',
      });
    }
  };

  const handleLeaveHousehold = async (): Promise<void> => {
    leaveHouseholdMutation.clearError();

    try {
      await leaveHouseholdMutation.submit();
      setIsLeaveSheetVisible(false);
      const refreshedMe = await meQuery.refetch();
      const remainingHouseholds = refreshedMe.data?.households ?? [];

      if (remainingHouseholds.length > 0) {
        setSelectedHouseholdId(remainingHouseholds[0]?.id ?? null);
        router.replace('/(app)/(tabs)' as Href);
      } else {
        router.replace('/(app)/onboarding/create-household' as Href);
      }

      showToast({
        message:
          remainingHouseholds.length > 0
            ? 'You can still switch to your remaining household from settings.'
            : 'Create or join a household to continue in Fridgr.',
        title: 'Household left',
        variant: 'success',
      });
    } catch {
      showToast({
        message:
          leaveHouseholdMutation.leaveErrorMessage ??
          'We could not leave this household. Please try again in a moment.',
        title: 'Leave failed',
        variant: 'error',
      });
    }
  };

  const handleSignOut = async (): Promise<void> => {
    resetError();

    try {
      await signOut();
      router.replace('/(auth)/sign-in' as Href);
    } catch {
      showToast({
        message: 'Please try again in a moment.',
        title: 'Sign out failed',
        variant: 'error',
      });
    }
  };

  if (meQuery.isLoading || (selectedHousehold !== null && householdQuery.isLoading)) {
    return <Spinner />;
  }

  if (!meQuery.data || !selectedHousehold) {
    return (
      <StateCard
        body="Your account is signed in, but Fridgr still needs a household before the settings screen can render."
        title="Settings will appear once your household finishes loading."
      />
    );
  }

  if (householdQuery.error) {
    return (
      <StateCard
        body={householdQuery.error.message}
        title="We couldn't load this household right now."
      />
    );
  }

  const householdDetails = householdQuery.data;

  if (!householdDetails) {
    return (
      <StateCard
        body="Refresh this screen in a moment and try again."
        title="Household details are still on the way."
      />
    );
  }

  const inviteCode =
    rotateInviteMutation.data?.invite_code ?? householdDetails.household.invite_code;
  const accountName = meQuery.data.user.display_name ?? meQuery.data.user.email;

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          backgroundColor: theme.colors.background,
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xxl,
        }}
      >
        <Header
          subtitle="Manage your household, account, and safety actions from one place."
          title="You"
        />

        {canSwitchHouseholds ? (
          <Card
            padding="md"
            style={{
              gap: theme.spacing.md,
            }}
          >
            <SectionLabel label="Household switcher" />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.sm,
              }}
            >
              {households.map((household) => {
                const isSelected = household.id === selectedHousehold.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={household.id}
                    onPress={() => {
                      setSelectedHouseholdId(household.id);
                      setIsEditingName(false);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      borderRadius: theme.radii.full,
                      borderWidth: theme.borderWidths.thin,
                      opacity: pressed ? theme.opacities.pressed : 1,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                    })}
                  >
                    <Text
                      allowFontScaling
                      style={{
                        color: isSelected ? theme.colors.primary : theme.colors.text,
                        fontSize: theme.typography.captionStrong.fontSize,
                        fontWeight: theme.typography.captionStrong.fontWeight,
                        lineHeight: theme.typography.captionStrong.lineHeight,
                      }}
                    >
                      {household.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ) : null}

        <Card
          padding="lg"
          style={{
            gap: theme.spacing.lg,
          }}
        >
          <SectionHeader
            description={
              isOwner
                ? 'Owners can edit household details and rotate the invite code.'
                : 'Members can view household details and copy the active invite code.'
            }
            title="Household"
          />

          <View style={{ gap: theme.spacing.md }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.captionStrong.fontSize,
                fontWeight: theme.typography.captionStrong.fontWeight,
                lineHeight: theme.typography.captionStrong.lineHeight,
                textTransform: 'uppercase',
              }}
            >
              Household name
            </Text>

            {isOwner && isEditingName ? (
              <Input
                autoCapitalize="words"
                autoFocus
                errorText={householdNameError ?? updateHouseholdMutation.fieldError('name')}
                maxLength={50}
                onBlur={() => {
                  void persistHouseholdName();
                }}
                onChangeText={(value) => {
                  setHouseholdNameDraft(value);
                  if (householdNameError) {
                    setHouseholdNameError(undefined);
                  }
                  updateHouseholdMutation.clearError();
                }}
                onSubmitEditing={() => {
                  void persistHouseholdName();
                }}
                returnKeyType="done"
                value={householdNameDraft}
              />
            ) : (
              <ListItem
                accessibilityLabel="Household name"
                onPress={
                  isOwner
                    ? () => {
                        setHouseholdNameDraft(householdDetails.household.name);
                        setHouseholdNameError(undefined);
                        updateHouseholdMutation.clearError();
                        setIsEditingName(true);
                      }
                    : undefined
                }
                right={
                  isOwner ? (
                    <IconButton
                      accessibilityLabel="Edit household name"
                      icon="pencil-outline"
                      onPress={() => {
                        setHouseholdNameDraft(householdDetails.household.name);
                        setHouseholdNameError(undefined);
                        updateHouseholdMutation.clearError();
                        setIsEditingName(true);
                      }}
                      variant="ghost"
                    />
                  ) : (
                    <RoleBadge role={selectedHousehold.role} />
                  )
                }
                subtitle={
                  isOwner
                    ? 'Tap to rename this household.'
                    : 'Only the household owner can edit the name.'
                }
                title={householdDetails.household.name}
              />
            )}
          </View>

          <Divider />

          <View style={{ gap: theme.spacing.md }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.textMuted,
                fontFamily: 'monospace',
                fontSize: theme.typography.captionStrong.fontSize,
                fontWeight: theme.typography.captionStrong.fontWeight,
                lineHeight: theme.typography.captionStrong.lineHeight,
                textTransform: 'uppercase',
              }}
            >
              Invite code
            </Text>

            <Card
              padding="md"
              style={{
                backgroundColor: theme.colors.primarySoft,
                borderColor: theme.colors.primary,
                gap: theme.spacing.sm,
              }}
            >
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.text,
                  fontFamily: 'monospace',
                  fontSize: theme.typography.heading.fontSize,
                  fontWeight: theme.typography.heading.fontWeight,
                  letterSpacing: 2,
                  lineHeight: theme.typography.heading.lineHeight,
                }}
              >
                {inviteCode ?? 'Unavailable'}
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
                {inviteCode
                  ? 'Share this code with someone you trust to let them join.'
                  : 'Refresh this household to load the active invite code.'}
              </Text>
            </Card>

            <View style={{ gap: theme.spacing.sm }}>
              <Button
                disabled={!inviteCode}
                label="Copy invite code"
                onPress={() => {
                  void handleCopyInviteCode();
                }}
                variant="secondary"
              />
              {isOwner ? (
                <Button
                  label="Rotate invite code"
                  onPress={() => setIsRotateSheetVisible(true)}
                  variant="destructive"
                />
              ) : null}
            </View>

            {isOwner ? (
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.caption.fontSize,
                  fontWeight: theme.typography.caption.fontWeight,
                  lineHeight: theme.typography.caption.lineHeight,
                }}
              >
                Rotating the code invalidates the old one immediately.
              </Text>
            ) : null}
          </View>

          <Divider />

          <SectionHeader
            description="Owners appear first. Everyone else is sorted alphabetically."
            title="Members"
          />

          <MemberList
            currentUserId={meQuery.data.user.id}
            currentUserRole={selectedHousehold.role}
            members={memberListMembers}
          />

          <Divider />

          <SectionHeader description="Read-only in v1." title="Account" />

          <View style={{ gap: theme.spacing.sm }}>
            <ListItem
              left={<Avatar name={accountName} size="md" />}
              subtitle="Display name"
              title={meQuery.data.user.display_name ?? 'Not set'}
            />
            <ListItem
              subtitle="Email"
              title={meQuery.data.user.email ?? session?.user.email ?? 'Unavailable'}
            />
          </View>

          <Divider />

          <SectionHeader
            description="These actions affect your account or household membership."
            title="Danger zone"
          />

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label="Leave household"
              onPress={() => setIsLeaveSheetVisible(true)}
              variant="secondary"
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
              {isOwner
                ? 'If you are the sole owner, Fridgr will block this action until ownership changes.'
                : 'Leaving removes your access to this household on this device too.'}
            </Text>

            {signOutError ? (
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
                  {signOutError.message}
                </Text>
              </View>
            ) : null}

            <Button
              label="Sign out"
              loading={isSigningOut}
              onPress={() => {
                void handleSignOut();
              }}
              variant="destructive"
            />
          </View>
        </Card>
      </ScrollView>

      <BottomSheet
        onClose={() => setIsRotateSheetVisible(false)}
        subtitle="The current code will stop working immediately, so only rotate it if you no longer want the old one shared."
        title="Generate a new invite code?"
        visible={isRotateSheetVisible}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label="Rotate invite code"
            loading={rotateInviteMutation.isPending}
            onPress={() => {
              void handleRotateInviteCode();
            }}
            variant="destructive"
          />
          <Button
            label="Cancel"
            onPress={() => setIsRotateSheetVisible(false)}
            variant="secondary"
          />
        </View>
      </BottomSheet>

      <BottomSheet
        onClose={() => setIsLeaveSheetVisible(false)}
        subtitle={getLeaveSheetSubtitle(selectedHousehold.role)}
        title="Leave this household?"
        visible={isLeaveSheetVisible}
      >
        <View style={{ gap: theme.spacing.sm }}>
          {leaveHouseholdMutation.leaveErrorMessage ? (
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
                {leaveHouseholdMutation.leaveErrorMessage}
              </Text>
            </View>
          ) : null}

          <Button
            label="Leave household"
            loading={leaveHouseholdMutation.isPending}
            onPress={() => {
              void handleLeaveHousehold();
            }}
            variant="destructive"
          />
          <Button
            label="Cancel"
            onPress={() => {
              leaveHouseholdMutation.clearError();
              setIsLeaveSheetVisible(false);
            }}
            variant="secondary"
          />
        </View>
      </BottomSheet>
    </>
  );
}

function StateCard({
  body,
  title,
}: Readonly<{
  body: string;
  title: string;
}>): JSX.Element {
  const theme = useTheme();

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
      <Card
        padding="lg"
        style={{
          gap: theme.spacing.md,
          maxWidth: 480,
          width: '100%',
        }}
      >
        <Text
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.title.fontSize,
            fontWeight: theme.typography.title.fontWeight,
            lineHeight: theme.typography.title.lineHeight,
            textAlign: 'center',
          }}
        >
          {title}
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
          {body}
        </Text>
      </Card>
    </View>
  );
}

function SectionHeader({
  description,
  title,
}: Readonly<{
  description?: string;
  title: string;
}>): JSX.Element {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <Text
        allowFontScaling
        style={{
          color: theme.colors.text,
          fontSize: theme.typography.title.fontSize,
          fontWeight: theme.typography.title.fontWeight,
          lineHeight: theme.typography.title.lineHeight,
        }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          allowFontScaling
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.typography.body.fontSize,
            fontWeight: theme.typography.body.fontWeight,
            lineHeight: theme.typography.body.lineHeight,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

function SectionLabel({ label }: Readonly<{ label: string }>): JSX.Element {
  const theme = useTheme();

  return (
    <Text
      allowFontScaling
      style={{
        color: theme.colors.textMuted,
        fontSize: theme.typography.captionStrong.fontSize,
        fontWeight: theme.typography.captionStrong.fontWeight,
        lineHeight: theme.typography.captionStrong.lineHeight,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  );
}

function RoleBadge({ role }: Readonly<{ role: 'member' | 'owner' }>): JSX.Element {
  const theme = useTheme();
  const isOwner = role === 'owner';

  return (
    <View
      style={{
        backgroundColor: isOwner ? theme.colors.primarySoft : theme.colors.surface,
        borderColor: isOwner ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.radii.full,
        borderWidth: theme.borderWidths.thin,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xxs,
      }}
    >
      <Text
        allowFontScaling
        style={{
          color: isOwner ? theme.colors.primary : theme.colors.textMuted,
          fontSize: theme.typography.captionStrong.fontSize,
          fontWeight: theme.typography.captionStrong.fontWeight,
          lineHeight: theme.typography.captionStrong.lineHeight,
          textTransform: 'capitalize',
        }}
      >
        {role}
      </Text>
    </View>
  );
}

function getLeaveSheetSubtitle(role: 'member' | 'owner'): string {
  if (role === 'owner') {
    return 'If you are the sole owner, Fridgr will block this until ownership changes.';
  }

  return 'You will lose access to this household on this device until you join again.';
}
