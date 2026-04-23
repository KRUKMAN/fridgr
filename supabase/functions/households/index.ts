import { getServiceClient } from '../_shared/db/client.ts';
import { err, handleOptions, ok } from '../_shared/helpers/response.ts';
import { validate } from '../_shared/helpers/validate.ts';
import { extractOperationId, withAuth, type AuthContext } from '../_shared/middleware/auth.ts';
import { withHousehold, type HouseholdContext } from '../_shared/middleware/householdGuard.ts';
import {
  createHouseholdSchema,
  joinHouseholdSchema,
  updateHouseholdSchema,
} from '../_shared/types/schemas/identity.ts';

type HouseholdRole = 'member' | 'owner';
type RouteKey =
  | 'GET /users/me'
  | 'POST /households'
  | 'POST /households/join'
  | 'GET /households/:id'
  | 'PATCH /households/:id'
  | 'POST /households/:id/leave'
  | 'POST /households/:id/rotate-invite'
  | 'GET /households/:id/members';

type HouseholdRecord = Readonly<{
  archived_at: string | null;
  id: string;
  invite_code: string | null;
  name: string;
  owner_id: string;
}>;

type HouseholdMemberRow = Readonly<{
  joined_at: string;
  role: HouseholdRole;
  user_id: string;
  users:
    | Readonly<{
        avatar_url: string | null;
        display_name: string | null;
      }>[]
    | null;
}>;

type LeavePolicyDecision =
  | Readonly<{
      type: 'allow';
      archive_household: boolean;
    }>
  | Readonly<{
      message: string;
      type: 'block';
    }>;

type UserProfile = Readonly<{
  avatar_url: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  last_active_at: string;
  target_carbs_mg: number | null;
  target_fat_mg: number | null;
  target_kcal: number;
  target_protein_mg: number | null;
}>;

type UserHouseholdRow = Readonly<{
  household_id: string;
  households:
    | Readonly<{
        archived_at: string | null;
        id: string;
        name: string;
      }>[]
    | null;
  role: HouseholdRole;
}>;

const FUNCTION_SEGMENT = 'households';
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_ATTEMPTS = 5;
const INVITE_CODE_LENGTH = 8;

type InviteCodeRandomizer = (values: Uint8Array) => Uint8Array;

const normalizeRouteSegments = (request: Request): readonly string[] => {
  const segments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const functionIndex = segments.lastIndexOf(FUNCTION_SEGMENT);
  const routeSegments = functionIndex === -1 ? segments : segments.slice(functionIndex + 1);

  if (routeSegments[0] === FUNCTION_SEGMENT) {
    return routeSegments.slice(1);
  }

  return routeSegments;
};

const getRouteKey = (request: Request): RouteKey | null => {
  const segments = normalizeRouteSegments(request);

  if (
    request.method === 'POST' &&
    (segments.length === 0 || (segments.length === 1 && segments[0] === FUNCTION_SEGMENT))
  ) {
    return 'POST /households';
  }

  if (
    request.method === 'GET' &&
    segments.length === 2 &&
    segments[0] === 'users' &&
    segments[1] === 'me'
  ) {
    return 'GET /users/me';
  }

  if (request.method === 'POST' && segments.length === 1 && segments[0] === 'join') {
    return 'POST /households/join';
  }

  if (segments.length === 1 && request.method === 'GET') {
    return 'GET /households/:id';
  }

  if (segments.length === 1 && request.method === 'PATCH') {
    return 'PATCH /households/:id';
  }

  if (segments.length === 2 && request.method === 'POST' && segments[1] === 'leave') {
    return 'POST /households/:id/leave';
  }

  if (segments.length === 2 && request.method === 'POST' && segments[1] === 'rotate-invite') {
    return 'POST /households/:id/rotate-invite';
  }

  if (segments.length === 2 && request.method === 'GET' && segments[1] === 'members') {
    return 'GET /households/:id/members';
  }

  return null;
};

export const createInviteCode = (
  randomValues: InviteCodeRandomizer = (values) => crypto.getRandomValues(values),
): string => {
  const values = new Uint8Array(INVITE_CODE_LENGTH);
  randomValues(values);

  return Array.from(
    values,
    (value) => INVITE_CODE_ALPHABET[value % INVITE_CODE_ALPHABET.length],
  ).join('');
};

export const decideLeavePolicy = ({
  owner_count,
  role,
  total_count,
}: Readonly<{
  owner_count: number;
  role: HouseholdRole;
  total_count: number;
}>): LeavePolicyDecision => {
  if (role !== 'owner') {
    return {
      archive_household: false,
      type: 'allow',
    };
  }

  if (owner_count === 1 && total_count > 1) {
    return {
      message: 'transfer ownership before leaving this household',
      type: 'block',
    };
  }

  if (total_count === 1) {
    return {
      archive_household: true,
      type: 'allow',
    };
  }

  return {
    archive_household: false,
    type: 'allow',
  };
};

const toHouseholdResponse = (household: HouseholdRecord) => ({
  archived_at: household.archived_at,
  id: household.id,
  name: household.name,
  owner_id: household.owner_id,
});

const toMemberResponse = (row: HouseholdMemberRow) => ({
  avatar_url: row.users?.[0]?.avatar_url ?? null,
  display_name: row.users?.[0]?.display_name ?? null,
  joined_at: row.joined_at,
  role: row.role,
  user_id: row.user_id,
});

const ensureOwner = (context: HouseholdContext): Response | null => {
  if (context.role === 'owner') {
    return null;
  }

  return err('forbidden', 'owner access required', 403, undefined, context.operation_id);
};

const fetchHousehold = async (householdId: string): Promise<HouseholdRecord | null> => {
  const service = getServiceClient();
  const { data, error } = await service
    .from('households')
    .select('id, name, owner_id, invite_code, archived_at')
    .eq('id', householdId)
    .maybeSingle<HouseholdRecord>();

  if (error) {
    throw error;
  }

  return data;
};

const fetchMembers = async (householdId: string): Promise<HouseholdMemberRow[]> => {
  const service = getServiceClient();
  const { data, error } = await service
    .from('household_members')
    .select('user_id, role, joined_at, users!inner(display_name, avatar_url)')
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as HouseholdMemberRow[];
};

const updateLastActiveAt = async (context: AuthContext): Promise<void> => {
  try {
    await context.supabase
      .from('users')
      .update({
        last_active_at: new Date().toISOString(),
      })
      .eq('id', context.user_id);
  } catch {
    // Best effort only.
  }
};

const createHouseholdWithInvite = async (
  context: AuthContext,
  name: string,
): Promise<HouseholdRecord> => {
  for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt += 1) {
    const inviteCode = createInviteCode();
    const { data, error } = await context.supabase
      .from('households')
      .insert({
        invite_code: inviteCode,
        name,
        owner_id: context.user_id,
      })
      .select('id, name, owner_id, invite_code, archived_at')
      .single<HouseholdRecord>();

    if (error) {
      if (error.code === '23505') {
        continue;
      }

      throw error;
    }

    const service = getServiceClient();
    const { error: membershipError } = await service.from('household_members').insert({
      household_id: data.id,
      role: 'owner',
      user_id: context.user_id,
    });

    if (membershipError) {
      await service.from('households').delete().eq('id', data.id);
      throw membershipError;
    }

    return data;
  }

  throw new Error('failed to generate a unique invite code');
};

const handleUsersMe = async (request: Request): Promise<Response> =>
  withAuth(request, async (_authenticatedRequest, context) => {
    const { data: user, error: userError } = await context.supabase
      .from('users')
      .select(
        [
          'id',
          'email',
          'display_name',
          'avatar_url',
          'target_kcal',
          'target_protein_mg',
          'target_carbs_mg',
          'target_fat_mg',
          'last_active_at',
        ].join(', '),
      )
      .eq('id', context.user_id)
      .maybeSingle<UserProfile>();

    if (userError) {
      return err(
        'internal_error',
        'failed to load user profile',
        500,
        undefined,
        context.operation_id,
      );
    }

    if (!user) {
      return err('not_found', 'user profile not found', 404, undefined, context.operation_id);
    }

    await updateLastActiveAt(context);

    const { data: memberships, error: membershipError } = await context.supabase
      .from('household_members')
      .select('household_id, role, households!inner(id, name, archived_at)')
      .eq('user_id', context.user_id)
      .order('joined_at', { ascending: true });

    if (membershipError) {
      return err(
        'internal_error',
        'failed to load user households',
        500,
        undefined,
        context.operation_id,
      );
    }

    const households = ((memberships ?? []) as UserHouseholdRow[])
      .filter((membership) => membership.households?.[0]?.archived_at === null)
      .map((membership) => ({
        id: membership.households?.[0]?.id ?? membership.household_id,
        name: membership.households?.[0]?.name ?? '',
        role: membership.role,
      }));

    return ok(
      {
        households,
        user,
      },
      context.operation_id,
    );
  });

const handleCreateHousehold = async (request: Request): Promise<Response> =>
  withAuth(request, async (authenticatedRequest, context) => {
    const validation = await validate(createHouseholdSchema, authenticatedRequest);

    if (!validation.ok) {
      return validation.response;
    }

    try {
      const household = await createHouseholdWithInvite(context, validation.data.name);

      return ok(
        {
          household: toHouseholdResponse(household),
          invite_code: household.invite_code,
        },
        context.operation_id,
        201,
      );
    } catch {
      return err(
        'internal_error',
        'failed to create household',
        500,
        undefined,
        context.operation_id,
      );
    }
  });

const handleJoinHousehold = async (request: Request): Promise<Response> =>
  withAuth(request, async (authenticatedRequest, context) => {
    const validation = await validate(joinHouseholdSchema, authenticatedRequest);

    if (!validation.ok) {
      return validation.response;
    }

    const inviteCode = validation.data.invite_code.trim().toUpperCase();
    const service = getServiceClient();
    const { data: household, error: householdError } = await service
      .from('households')
      .select('id, name, owner_id, invite_code, archived_at')
      .ilike('invite_code', inviteCode)
      .is('archived_at', null)
      .maybeSingle<HouseholdRecord>();

    if (householdError) {
      return err(
        'internal_error',
        'failed to look up household invite',
        500,
        undefined,
        context.operation_id,
      );
    }

    if (!household) {
      return err('not_found', 'invite code not found', 404, undefined, context.operation_id);
    }

    const { data: existingMembership, error: membershipLookupError } = await service
      .from('household_members')
      .select('user_id')
      .eq('household_id', household.id)
      .eq('user_id', context.user_id)
      .maybeSingle<{ user_id: string }>();

    if (membershipLookupError) {
      return err(
        'internal_error',
        'failed to verify membership',
        500,
        undefined,
        context.operation_id,
      );
    }

    if (existingMembership) {
      return err(
        'already_member',
        'already a household member',
        409,
        undefined,
        context.operation_id,
      );
    }

    const { error: joinError } = await service.from('household_members').insert({
      household_id: household.id,
      role: 'member',
      user_id: context.user_id,
    });

    if (joinError) {
      return err(
        'internal_error',
        'failed to join household',
        500,
        undefined,
        context.operation_id,
      );
    }

    return ok(
      {
        household: toHouseholdResponse(household),
      },
      context.operation_id,
    );
  });

const handleGetHousehold = async (request: Request): Promise<Response> =>
  withAuth(
    request,
    withHousehold({ householdIdFrom: 'path' })(async (_householdRequest, context) => {
      try {
        const [household, members] = await Promise.all([
          fetchHousehold(context.household_id),
          fetchMembers(context.household_id),
        ]);

        if (!household || household.archived_at) {
          return err('not_found', 'household not found', 404, undefined, context.operation_id);
        }

        return ok(
          {
            household: toHouseholdResponse(household),
            members: members.map(toMemberResponse),
          },
          context.operation_id,
        );
      } catch {
        return err(
          'internal_error',
          'failed to load household',
          500,
          undefined,
          context.operation_id,
        );
      }
    }),
  );

const handleUpdateHousehold = async (request: Request): Promise<Response> =>
  withAuth(
    request,
    withHousehold({ householdIdFrom: 'path' })(async (householdRequest, context) => {
      const ownerError = ensureOwner(context);

      if (ownerError) {
        return ownerError;
      }

      const validation = await validate(updateHouseholdSchema, householdRequest);

      if (!validation.ok) {
        return validation.response;
      }

      const { data, error } = await context.supabase
        .from('households')
        .update({
          name: validation.data.name,
        })
        .eq('id', context.household_id)
        .select('id, name, owner_id, invite_code, archived_at')
        .single<HouseholdRecord>();

      if (error) {
        return err(
          'internal_error',
          'failed to update household',
          500,
          undefined,
          context.operation_id,
        );
      }

      return ok(
        {
          household: toHouseholdResponse(data),
        },
        context.operation_id,
      );
    }),
  );

const handleRotateInvite = async (request: Request): Promise<Response> =>
  withAuth(
    request,
    withHousehold({ householdIdFrom: 'path' })(async (_householdRequest, context) => {
      const ownerError = ensureOwner(context);

      if (ownerError) {
        return ownerError;
      }

      for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt += 1) {
        const inviteCode = createInviteCode();
        const { data, error } = await context.supabase
          .from('households')
          .update({
            invite_code: inviteCode,
          })
          .eq('id', context.household_id)
          .select('invite_code')
          .single<{ invite_code: string | null }>();

        if (error) {
          if (error.code === '23505') {
            continue;
          }

          return err(
            'internal_error',
            'failed to rotate invite code',
            500,
            undefined,
            context.operation_id,
          );
        }

        return ok(
          {
            invite_code: data.invite_code,
          },
          context.operation_id,
        );
      }

      return err(
        'internal_error',
        'failed to rotate invite code',
        500,
        undefined,
        context.operation_id,
      );
    }),
  );

const handleHouseholdMembers = async (request: Request): Promise<Response> =>
  withAuth(
    request,
    withHousehold({ householdIdFrom: 'path' })(async (_householdRequest, context) => {
      try {
        const members = await fetchMembers(context.household_id);

        return ok(
          {
            members: members.map(toMemberResponse),
          },
          context.operation_id,
        );
      } catch {
        return err(
          'internal_error',
          'failed to load household members',
          500,
          undefined,
          context.operation_id,
        );
      }
    }),
  );

const handleHouseholdLeave = async (request: Request): Promise<Response> =>
  withAuth(
    request,
    withHousehold({ householdIdFrom: 'path' })(async (_householdRequest, context) => {
      const service = getServiceClient();
      const { data: membershipCounts, error: countError } = await service
        .from('household_members')
        .select('role')
        .eq('household_id', context.household_id);

      if (countError) {
        return err(
          'internal_error',
          'failed to evaluate leave policy',
          500,
          undefined,
          context.operation_id,
        );
      }

      const ownerCount = (membershipCounts ?? []).filter((row) => row.role === 'owner').length;
      const totalCount = (membershipCounts ?? []).length;
      const decision = decideLeavePolicy({
        owner_count: ownerCount,
        role: context.role,
        total_count: totalCount,
      });

      if (decision.type === 'block') {
        return err(
          'sole_owner_cannot_leave',
          decision.message,
          409,
          undefined,
          context.operation_id,
        );
      }

      if (decision.archive_household) {
        const { error: archiveError } = await service
          .from('households')
          .update({
            archived_at: new Date().toISOString(),
          })
          .eq('id', context.household_id);

        if (archiveError) {
          return err(
            'internal_error',
            'failed to archive household',
            500,
            undefined,
            context.operation_id,
          );
        }
      }

      const { error: deleteError } = await service
        .from('household_members')
        .delete()
        .eq('household_id', context.household_id)
        .eq('user_id', context.user_id);

      if (deleteError) {
        return err(
          'internal_error',
          'failed to leave household',
          500,
          undefined,
          context.operation_id,
        );
      }

      return ok(
        {
          archived: decision.archive_household,
          household_id: context.household_id,
        },
        context.operation_id,
      );
    }),
  );

const routeHandlers: Readonly<Record<RouteKey, (request: Request) => Promise<Response>>> = {
  'GET /users/me': handleUsersMe,
  'POST /households': handleCreateHousehold,
  'POST /households/join': handleJoinHousehold,
  'GET /households/:id': handleGetHousehold,
  'PATCH /households/:id': handleUpdateHousehold,
  'POST /households/:id/leave': handleHouseholdLeave,
  'POST /households/:id/rotate-invite': handleRotateInvite,
  'GET /households/:id/members': handleHouseholdMembers,
};

export const handler = async (request: Request): Promise<Response> => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  const routeKey = getRouteKey(request);

  if (!routeKey) {
    return err('not_found', 'route not found', 404, undefined, extractOperationId(request));
  }

  return routeHandlers[routeKey](request);
};

if (import.meta.main) {
  Deno.serve(handler);
}
