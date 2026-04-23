import { assertEquals } from 'jsr:@std/assert@1.0.19';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.1';

import type { AuthContext } from './householdGuard.ts';
import { withHousehold } from './householdGuard.ts';

type MembershipRow = {
  role: 'member' | 'owner';
} | null;

type MembershipQueryState = {
  readonly filters: Map<string, string>;
  readonly row: MembershipRow;
};

class MockMembershipQuery {
  public constructor(
    private readonly state: MembershipQueryState,
    private readonly error: Error | null,
  ) {}

  public eq(column: string, value: string): MockMembershipQuery {
    this.state.filters.set(column, value);
    return this;
  }

  public async maybeSingle<T>(): Promise<{ data: T | null; error: Error | null }> {
    return {
      data: this.state.row as T | null,
      error: this.error,
    };
  }
}

class MockSupabaseClient {
  public readonly queryStates: MembershipQueryState[] = [];
  public nextError: Error | null = null;
  public nextRow: MembershipRow = null;

  public from(table: string): { select: (columns: string) => MockMembershipQuery } {
    assertEquals(table, 'household_members');

    return {
      select: (columns: string) => {
        assertEquals(columns, 'role');

        const state: MembershipQueryState = {
          filters: new Map<string, string>(),
          row: this.nextRow,
        };

        this.queryStates.push(state);

        return new MockMembershipQuery(state, this.nextError);
      },
    };
  }
}

const createContext = (supabase: MockSupabaseClient): AuthContext => ({
  jwt: 'jwt-token',
  operation_id: 'op-123',
  supabase: supabase as unknown as SupabaseClient,
  user_id: 'user-1',
});

const readJson = async (response: Response): Promise<unknown> => await response.json();

Deno.test('returns 400 when household id is missing from path', async () => {
  const supabase = new MockSupabaseClient();
  const handler = withHousehold({ householdIdFrom: 'path' })(async () => new Response('ok'));

  const response = await handler(
    new Request('https://example.supabase.co/functions/v1/households'),
    createContext(supabase),
  );

  assertEquals(response.status, 400);
  assertEquals(await readJson(response), {
    data: null,
    error: {
      code: 'bad_request',
      message: 'household_id required',
    },
    operation_id: 'op-123',
  });
  assertEquals(supabase.queryStates.length, 0);
});

Deno.test('returns 400 when household id is missing from the body', async () => {
  const supabase = new MockSupabaseClient();
  const handler = withHousehold({ householdIdFrom: 'body' })(async () => new Response('ok'));

  const response = await handler(
    new Request('https://example.supabase.co/functions/v1/diary/entries', {
      body: JSON.stringify({ note: 'missing household' }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }),
    createContext(supabase),
  );

  assertEquals(response.status, 400);
  assertEquals(await readJson(response), {
    data: null,
    error: {
      code: 'bad_request',
      message: 'household_id required',
    },
    operation_id: 'op-123',
  });
  assertEquals(supabase.queryStates.length, 0);
});

Deno.test('returns 403 when the caller is not a household member', async () => {
  const supabase = new MockSupabaseClient();
  const handler = withHousehold({ householdIdFrom: 'path' })(async () => new Response('ok'));

  const response = await handler(
    new Request('https://example.supabase.co/functions/v1/households/household-7/members'),
    createContext(supabase),
  );

  assertEquals(response.status, 403);
  assertEquals(await readJson(response), {
    data: null,
    error: {
      code: 'forbidden',
      message: 'not a household member',
    },
    operation_id: 'op-123',
  });
  assertEquals(supabase.queryStates.length, 1);
  assertEquals(
    Array.from(supabase.queryStates[0].filters.entries()).sort(([left], [right]) =>
      left.localeCompare(right)
    ),
    [
      ['household_id', 'household-7'],
      ['user_id', 'user-1'],
    ],
  );
});

Deno.test('passes household_id and role through to the wrapped handler', async () => {
  const supabase = new MockSupabaseClient();
  supabase.nextRow = { role: 'owner' };
  const request = new Request('https://example.supabase.co/functions/v1/households/abc/fridge', {
    body: JSON.stringify({ household_id: 'abc', note: 'still readable' }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const handler = withHousehold({ householdIdFrom: 'body' })(
    async (wrappedRequest, context) =>
      Response.json({
        household_id: context.household_id,
        role: context.role,
        body: await wrappedRequest.json(),
      }),
  );

  const response = await handler(request, createContext(supabase));

  assertEquals(response.status, 200);
  assertEquals(await readJson(response), {
    body: {
      household_id: 'abc',
      note: 'still readable',
    },
    household_id: 'abc',
    role: 'owner',
  });
  assertEquals(supabase.queryStates.length, 1);
});

Deno.test('supports custom household id resolvers', async () => {
  const supabase = new MockSupabaseClient();
  supabase.nextRow = { role: 'member' };
  const handler = withHousehold({
    householdIdFrom: (_request, context) => `${context.user_id}-household`,
  })((_request, context) =>
    Response.json({
      household_id: context.household_id,
      role: context.role,
      user_id: context.user_id,
    }));

  const response = await handler(
    new Request('https://example.supabase.co/functions/v1/serve-splits/portion-1/accept'),
    createContext(supabase),
  );

  assertEquals(response.status, 200);
  assertEquals(await readJson(response), {
    household_id: 'user-1-household',
    role: 'member',
    user_id: 'user-1',
  });
  assertEquals(supabase.queryStates.length, 1);
  assertEquals(
    Array.from(supabase.queryStates[0].filters.entries()).sort(([left], [right]) =>
      left.localeCompare(right)
    ),
    [
      ['household_id', 'user-1-household'],
      ['user_id', 'user-1'],
    ],
  );
});
