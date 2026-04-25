import { assertEquals, assertMatch } from 'jsr:@std/assert@1.0.19';

import { createInviteCode, decideLeavePolicy, executeLeaveHousehold } from './index.ts';

type HouseholdRole = 'member' | 'owner';
type ServeSplitStatus = 'completed' | 'expired' | 'pending';

type MembershipRecord = Readonly<{
  household_id: string;
  role: HouseholdRole;
  user_id: string;
}>;

type HouseholdRecord = Readonly<{
  archived_at: string | null;
  id: string;
}>;

type ServeSplitRecord = Readonly<{
  created_by: string;
  household_id: string;
  id: string;
  status: ServeSplitStatus;
}>;

type PrivateInventoryRecord = Readonly<{
  household_id: string;
  id: string;
  user_id: string;
}>;

type DiaryEntryRecord = Readonly<{
  household_id: string;
  id: string;
  snapshot_food_name: string;
  user_id: string;
}>;

type FakeLeaveState = {
  diaryEntries: DiaryEntryRecord[];
  households: HouseholdRecord[];
  memberships: MembershipRecord[];
  privateInventoryItems: PrivateInventoryRecord[];
  serveSplitEvents: ServeSplitRecord[];
};

type FakeLeaveFailures = Partial<
  Readonly<{
    archiveHousehold: true;
    deleteMembership: true;
    expirePendingServeSplits: true;
    listMembershipRoles: true;
  }>
>;

class FakeLeaveService {
  public constructor(
    public readonly state: FakeLeaveState,
    private readonly failures: FakeLeaveFailures = {},
  ) {}

  public async archiveHousehold(
    householdId: string,
    archivedAt: string,
  ): Promise<{ error: Error | null }> {
    if (this.failures.archiveHousehold) {
      return { error: new Error('archive failed') };
    }

    this.state.households = this.state.households.map((household) =>
      household.id === householdId
        ? {
            ...household,
            archived_at: archivedAt,
          }
        : household,
    );

    return { error: null };
  }

  public async deleteMembership(
    householdId: string,
    userId: string,
  ): Promise<{ error: Error | null }> {
    if (this.failures.deleteMembership) {
      return { error: new Error('delete failed') };
    }

    this.state.memberships = this.state.memberships.filter(
      (membership) => membership.household_id !== householdId || membership.user_id !== userId,
    );

    return { error: null };
  }

  public async expirePendingServeSplits(
    householdId: string,
    userId: string,
  ): Promise<{ error: Error | null }> {
    if (this.failures.expirePendingServeSplits) {
      return { error: new Error('expire failed') };
    }

    this.state.serveSplitEvents = this.state.serveSplitEvents.map((event) =>
      event.household_id === householdId &&
      event.created_by === userId &&
      event.status === 'pending'
        ? {
            ...event,
            status: 'expired',
          }
        : event,
    );

    return { error: null };
  }

  public async listMembershipRoles(
    householdId: string,
  ): Promise<{
    data: ReadonlyArray<Readonly<{ role: HouseholdRole }>> | null;
    error: Error | null;
  }> {
    if (this.failures.listMembershipRoles) {
      return { data: null, error: new Error('count failed') };
    }

    return {
      data: this.state.memberships
        .filter((membership) => membership.household_id === householdId)
        .map((membership) => ({
          role: membership.role,
        })),
      error: null,
    };
  }
}

const createLeaveState = (overrides: Partial<FakeLeaveState> = {}): FakeLeaveState => ({
  diaryEntries: overrides.diaryEntries ?? [],
  households: overrides.households ?? [
    {
      archived_at: null,
      id: 'household-1',
    },
  ],
  memberships: overrides.memberships ?? [
    {
      household_id: 'household-1',
      role: 'owner',
      user_id: 'owner-1',
    },
    {
      household_id: 'household-1',
      role: 'member',
      user_id: 'member-1',
    },
  ],
  privateInventoryItems: overrides.privateInventoryItems ?? [],
  serveSplitEvents: overrides.serveSplitEvents ?? [],
});

const createLeaveContext = (
  overrides: Partial<{
    household_id: string;
    operation_id: string;
    role: HouseholdRole;
    user_id: string;
  }> = {},
) => ({
  household_id: overrides.household_id ?? 'household-1',
  operation_id: overrides.operation_id ?? 'op-leave-1',
  role: overrides.role ?? 'member',
  user_id: overrides.user_id ?? 'member-1',
});

const readBody = async (response: Response): Promise<unknown> => await response.json();

Deno.test(
  'createInviteCode builds an 8-character uppercase base32 code without ambiguous glyphs',
  () => {
    const code = createInviteCode((values: Uint8Array) => {
      values.set([0, 1, 2, 3, 4, 5, 6, 7]);
      return values;
    });

    assertEquals(code.length, 8);
    assertMatch(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  },
);

Deno.test('decideLeavePolicy allows non-owner members to leave', () => {
  assertEquals(
    decideLeavePolicy({
      owner_count: 1,
      role: 'member',
      total_count: 3,
    }),
    {
      archive_household: false,
      type: 'allow',
    },
  );
});

Deno.test('decideLeavePolicy blocks the sole owner from leaving when others remain', () => {
  assertEquals(
    decideLeavePolicy({
      owner_count: 1,
      role: 'owner',
      total_count: 2,
    }),
    {
      message: 'transfer ownership before leaving this household',
      type: 'block',
    },
  );
});

Deno.test(
  'decideLeavePolicy allows the last remaining owner to leave and archives the household',
  () => {
    assertEquals(
      decideLeavePolicy({
        owner_count: 1,
        role: 'owner',
        total_count: 1,
      }),
      {
        archive_household: true,
        type: 'allow',
      },
    );
  },
);

Deno.test('decideLeavePolicy allows an owner to leave when another owner remains', () => {
  assertEquals(
    decideLeavePolicy({
      owner_count: 2,
      role: 'owner',
      total_count: 3,
    }),
    {
      archive_household: false,
      type: 'allow',
    },
  );
});

Deno.test(
  'non-owner leaves and their membership row is deleted while the household stays active',
  async () => {
    const service = new FakeLeaveService(
      createLeaveState({
        memberships: [
          {
            household_id: 'household-1',
            role: 'owner',
            user_id: 'owner-1',
          },
          {
            household_id: 'household-1',
            role: 'member',
            user_id: 'member-1',
          },
        ],
      }),
    );

    const response = await executeLeaveHousehold(service, createLeaveContext());

    assertEquals(response.status, 200);
    assertEquals(await readBody(response), {
      data: {
        archived: false,
        household_id: 'household-1',
      },
      error: null,
      operation_id: 'op-leave-1',
    });
    assertEquals(service.state.memberships, [
      {
        household_id: 'household-1',
        role: 'owner',
        user_id: 'owner-1',
      },
    ]);
    assertEquals(service.state.households[0]?.archived_at, null);
  },
);

Deno.test('owner with co-owners leaves and only their membership row is deleted', async () => {
  const service = new FakeLeaveService(
    createLeaveState({
      memberships: [
        {
          household_id: 'household-1',
          role: 'owner',
          user_id: 'owner-1',
        },
        {
          household_id: 'household-1',
          role: 'owner',
          user_id: 'owner-2',
        },
        {
          household_id: 'household-1',
          role: 'member',
          user_id: 'member-1',
        },
      ],
    }),
  );

  const response = await executeLeaveHousehold(
    service,
    createLeaveContext({
      role: 'owner',
      user_id: 'owner-1',
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(service.state.memberships, [
    {
      household_id: 'household-1',
      role: 'owner',
      user_id: 'owner-2',
    },
    {
      household_id: 'household-1',
      role: 'member',
      user_id: 'member-1',
    },
  ]);
  assertEquals(service.state.households[0]?.archived_at, null);
});

Deno.test('sole owner with other members gets a 409 and no mutation occurs', async () => {
  const state = createLeaveState({
    memberships: [
      {
        household_id: 'household-1',
        role: 'owner',
        user_id: 'owner-1',
      },
      {
        household_id: 'household-1',
        role: 'member',
        user_id: 'member-1',
      },
    ],
  });
  const service = new FakeLeaveService(state);

  const response = await executeLeaveHousehold(
    service,
    createLeaveContext({
      role: 'owner',
      user_id: 'owner-1',
    }),
  );

  assertEquals(response.status, 409);
  assertEquals(await readBody(response), {
    data: null,
    error: {
      code: 'sole_owner_cannot_leave',
      message: 'transfer ownership before leaving this household',
    },
    operation_id: 'op-leave-1',
  });
  assertEquals(service.state.memberships, state.memberships);
  assertEquals(service.state.households, state.households);
});

Deno.test(
  'last person leaving archives the household and deletes their membership row',
  async () => {
    const service = new FakeLeaveService(
      createLeaveState({
        memberships: [
          {
            household_id: 'household-1',
            role: 'owner',
            user_id: 'owner-1',
          },
        ],
      }),
    );

    const response = await executeLeaveHousehold(
      service,
      createLeaveContext({
        role: 'owner',
        user_id: 'owner-1',
      }),
    );

    assertEquals(response.status, 200);
    assertEquals(service.state.memberships, []);
    assertMatch(service.state.households[0]?.archived_at ?? '', /^\d{4}-\d{2}-\d{2}T/);
  },
);

Deno.test(
  'leaving expires pending serve/splits created by the leaver and keeps committed ones unchanged',
  async () => {
    const service = new FakeLeaveService(
      createLeaveState({
        serveSplitEvents: [
          {
            created_by: 'member-1',
            household_id: 'household-1',
            id: 'event-pending-same-household',
            status: 'pending',
          },
          {
            created_by: 'member-1',
            household_id: 'household-1',
            id: 'event-completed-same-household',
            status: 'completed',
          },
          {
            created_by: 'member-1',
            household_id: 'household-2',
            id: 'event-pending-other-household',
            status: 'pending',
          },
          {
            created_by: 'member-2',
            household_id: 'household-1',
            id: 'event-pending-other-user',
            status: 'pending',
          },
        ],
      }),
    );

    const response = await executeLeaveHousehold(service, createLeaveContext());

    assertEquals(response.status, 200);
    assertEquals(service.state.serveSplitEvents, [
      {
        created_by: 'member-1',
        household_id: 'household-1',
        id: 'event-pending-same-household',
        status: 'expired',
      },
      {
        created_by: 'member-1',
        household_id: 'household-1',
        id: 'event-completed-same-household',
        status: 'completed',
      },
      {
        created_by: 'member-1',
        household_id: 'household-2',
        id: 'event-pending-other-household',
        status: 'pending',
      },
      {
        created_by: 'member-2',
        household_id: 'household-1',
        id: 'event-pending-other-user',
        status: 'pending',
      },
    ]);
  },
);

Deno.test(
  'private inventory rows survive leave because the handler does not mutate them',
  async () => {
    const privateInventoryItems: PrivateInventoryRecord[] = [
      {
        household_id: 'household-1',
        id: 'inventory-1',
        user_id: 'member-1',
      },
    ];
    const service = new FakeLeaveService(
      createLeaveState({
        privateInventoryItems,
      }),
    );

    const response = await executeLeaveHousehold(service, createLeaveContext());

    assertEquals(response.status, 200);
    assertEquals(service.state.privateInventoryItems, privateInventoryItems);
  },
);

Deno.test(
  'diary entries survive leave because the handler does not mutate user-owned snapshots',
  async () => {
    const diaryEntries: DiaryEntryRecord[] = [
      {
        household_id: 'household-1',
        id: 'diary-1',
        snapshot_food_name: 'Tomato soup',
        user_id: 'member-1',
      },
    ];
    const service = new FakeLeaveService(
      createLeaveState({
        diaryEntries,
      }),
    );

    const response = await executeLeaveHousehold(service, createLeaveContext());

    assertEquals(response.status, 200);
    assertEquals(service.state.diaryEntries, diaryEntries);
  },
);
