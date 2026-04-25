/* eslint-disable react-native/no-inline-styles */

import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { Avatar } from '../Avatar';
import { BottomSheet } from '../BottomSheet';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { ListItem } from '../ListItem';

import type { JSX } from 'react';

export type MemberListMember = Readonly<{
  avatar_url: string | null;
  display_name: string;
  joined_at: string;
  role: 'owner' | 'member';
  user_id: string;
}>;

export type MemberListProps = Readonly<{
  currentUserId: string;
  currentUserRole: 'owner' | 'member';
  members: readonly MemberListMember[];
  onRemoveMember?: (userId: string) => void;
}>;

export function MemberList({
  currentUserId,
  currentUserRole,
  members,
  onRemoveMember,
}: MemberListProps): JSX.Element {
  const theme = useTheme();
  const [pendingRemovalMember, setPendingRemovalMember] = useState<MemberListMember | null>(null);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === 'owner' ? -1 : 1;
        }

        return left.display_name.localeCompare(right.display_name, undefined, {
          sensitivity: 'base',
        });
      }),
    [members],
  );

  const canRemoveMembers = currentUserRole === 'owner' && typeof onRemoveMember === 'function';

  if (sortedMembers.length === 0) {
    return (
      <View
        style={{
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          borderWidth: theme.borderWidths.thin,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.lg,
        }}
      >
        <Text
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.bodyStrong.fontSize,
            fontWeight: theme.typography.bodyStrong.fontWeight,
            lineHeight: theme.typography.bodyStrong.lineHeight,
          }}
        >
          No members
        </Text>
        <Text
          allowFontScaling
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: theme.typography.caption.fontWeight,
            lineHeight: theme.typography.caption.lineHeight,
            marginTop: theme.spacing.xxs,
          }}
        >
          This household does not have any visible members yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {sortedMembers.map((member) => {
        const isCurrentUser = member.user_id === currentUserId;
        const joinedLabel = formatJoinedDate(member.joined_at);
        const canRemoveMember = canRemoveMembers && !isCurrentUser;

        return (
          <ListItem
            accessibilityLabel={`${member.display_name}${isCurrentUser ? ', you' : ''}, ${member.role}, joined ${joinedLabel}`}
            key={member.user_id}
            left={
              <Avatar
                accessibilityLabel={`${member.display_name} avatar`}
                name={member.display_name}
                uri={member.avatar_url}
              />
            }
            right={
              <View
                style={{
                  alignItems: 'flex-end',
                  flexDirection: 'row',
                  gap: theme.spacing.sm,
                }}
              >
                <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
                  <RoleBadge role={member.role} />
                  <Text
                    allowFontScaling
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.typography.caption.fontSize,
                      fontWeight: theme.typography.caption.fontWeight,
                      lineHeight: theme.typography.caption.lineHeight,
                    }}
                  >
                    {joinedLabel}
                  </Text>
                </View>
                {canRemoveMember ? (
                  <IconButton
                    accessibilityLabel={`Remove ${member.display_name} from household`}
                    icon="trash-outline"
                    onPress={() => setPendingRemovalMember(member)}
                    size="sm"
                    variant="destructive"
                  />
                ) : null}
              </View>
            }
            subtitle={isCurrentUser ? 'You' : undefined}
            title={isCurrentUser ? `${member.display_name} (you)` : member.display_name}
          />
        );
      })}

      {onRemoveMember ? (
        <BottomSheet
          onClose={() => setPendingRemovalMember(null)}
          subtitle={
            pendingRemovalMember
              ? `${pendingRemovalMember.display_name} will lose access to this household until they join again with a fresh invite.`
              : undefined
          }
          title={
            pendingRemovalMember
              ? `Remove ${pendingRemovalMember.display_name} from household?`
              : 'Remove member'
          }
          visible={pendingRemovalMember !== null}
        >
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              accessibilityLabel={
                pendingRemovalMember
                  ? `Confirm removing ${pendingRemovalMember.display_name}`
                  : 'Confirm removing member'
              }
              label="Remove member"
              onPress={() => {
                if (!pendingRemovalMember || !onRemoveMember) {
                  return;
                }

                onRemoveMember(pendingRemovalMember.user_id);
                setPendingRemovalMember(null);
              }}
              variant="destructive"
            />
            <Button
              accessibilityLabel="Cancel remove member"
              label="Cancel"
              onPress={() => setPendingRemovalMember(null)}
              variant="secondary"
            />
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function RoleBadge({ role }: Readonly<{ role: MemberListMember['role'] }>): JSX.Element {
  const theme = useTheme();
  const isOwner = role === 'owner';

  return (
    <View
      style={{
        backgroundColor: isOwner ? theme.colors.primarySoft : theme.colors.surfaceMuted,
        borderRadius: theme.radii.full,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
      }}
    >
      <Text
        allowFontScaling
        style={{
          color: isOwner ? theme.colors.primary : theme.colors.textMuted,
          fontSize: theme.typography.micro.fontSize,
          fontWeight: theme.typography.micro.fontWeight,
          lineHeight: theme.typography.micro.lineHeight,
          textTransform: 'capitalize',
        }}
      >
        {role}
      </Text>
    </View>
  );
}

function formatJoinedDate(joinedAt: string): string {
  const date = new Date(joinedAt);

  if (Number.isNaN(date.getTime())) {
    return joinedAt;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
