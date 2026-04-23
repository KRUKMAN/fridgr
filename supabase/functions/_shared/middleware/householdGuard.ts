import type { RequestContext } from '../types/context.ts';
import { err } from '../helpers/response.ts';

type HouseholdRole = 'owner' | 'member';
type MaybePromise<T> = T | Promise<T>;

export type AuthContext = RequestContext &
  Readonly<{
    jwt: string;
  }>;

export type HouseholdContext = AuthContext &
  Readonly<{
    household_id: string;
    role: HouseholdRole;
  }>;

export type AuthenticatedHandler<TContext extends AuthContext = AuthContext> = (
  request: Request,
  context: TContext,
) => MaybePromise<Response>;

type HouseholdIdResolver =
  | 'body'
  | 'path'
  | ((request: Request, context: AuthContext) => MaybePromise<string | null | undefined>);

export type WithHouseholdOptions = Readonly<{
  householdIdFrom: HouseholdIdResolver;
}>;

type HouseholdMembershipRecord = Readonly<{
  role: HouseholdRole;
}>;

const HOUSEHOLD_SEGMENT = 'households';

const isHouseholdRole = (value: unknown): value is HouseholdRole =>
  value === 'member' || value === 'owner';

const getHouseholdIdFromPath = (request: Request): string | null => {
  const segments = new URL(request.url).pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const householdSegmentIndex = segments.lastIndexOf(HOUSEHOLD_SEGMENT);

  if (householdSegmentIndex === -1) {
    return null;
  }

  return segments[householdSegmentIndex + 1] ?? null;
};

const getHouseholdIdFromBody = async (request: Request): Promise<string | null> => {
  try {
    const payload = await request.clone().json();

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return null;
    }

    const householdId = Reflect.get(payload, 'household_id');

    return typeof householdId === 'string' && householdId.length > 0 ? householdId : null;
  } catch {
    return null;
  }
};

const resolveHouseholdId = async (
  request: Request,
  context: AuthContext,
  resolver: HouseholdIdResolver,
): Promise<string | null> => {
  if (resolver === 'path') {
    return getHouseholdIdFromPath(request);
  }

  if (resolver === 'body') {
    return await getHouseholdIdFromBody(request);
  }

  return (await resolver(request, context)) ?? null;
};

const getMembership = async (
  context: AuthContext,
  householdId: string,
): Promise<HouseholdMembershipRecord | null> => {
  const { data, error } = await context.supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', context.user_id)
    .maybeSingle<HouseholdMembershipRecord>();

  if (error) {
    throw error;
  }

  if (!data || !isHouseholdRole(data.role)) {
    return null;
  }

  return data;
};
export const withHousehold =
  (options: WithHouseholdOptions) =>
  (handler: AuthenticatedHandler<HouseholdContext>): AuthenticatedHandler =>
  async (request: Request, context: AuthContext): Promise<Response> => {
    const householdId = await resolveHouseholdId(request, context, options.householdIdFrom);

    if (!householdId) {
      return err('bad_request', 'household_id required', 400, undefined, context.operation_id);
    }

    try {
      const membership = await getMembership(context, householdId);

      if (!membership) {
        return err('forbidden', 'not a household member', 403, undefined, context.operation_id);
      }

      return await handler(request, {
        ...context,
        household_id: householdId,
        role: membership.role,
      });
    } catch {
      return err(
        'internal_error',
        'failed to verify household membership',
        500,
        undefined,
        context.operation_id,
      );
    }
  };
