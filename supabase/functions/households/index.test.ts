import { assertEquals, assertMatch } from 'jsr:@std/assert@1.0.19';

import { createInviteCode, decideLeavePolicy } from './index.ts';

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
