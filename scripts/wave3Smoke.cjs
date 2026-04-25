const assert = require('node:assert/strict');

const functionBaseUrl = process.env.SUPABASE_FUNCTIONS_URL ?? '';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const memberEmail = process.env.SMOKE_MEMBER_EMAIL ?? '';
const memberPassword = process.env.SMOKE_MEMBER_PASSWORD ?? '';
const nonMemberEmail = process.env.SMOKE_NON_MEMBER_EMAIL ?? '';
const nonMemberPassword = process.env.SMOKE_NON_MEMBER_PASSWORD ?? '';
const householdId = process.env.SMOKE_HOUSEHOLD_ID ?? '';

const checks = [];

const addCheck = (name, run) => {
  checks.push({ name, run });
};

const requireEnv = (name, value) => {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
};

const endpoint = (functionName, path) =>
  `${functionBaseUrl.replace(/\/$/, '')}/${functionName}${path}`;

const readJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
};

const signIn = async (email, password) => {
  requireEnv('EXPO_PUBLIC_SUPABASE_URL', supabaseUrl);
  requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', anonKey);

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify({ email, password }),
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
  const payload = await readJson(response);

  assert.equal(response.status, 200, `sign-in failed for ${email}: ${JSON.stringify(payload)}`);
  assert.equal(typeof payload.access_token, 'string');

  return payload.access_token;
};

const request = async (functionName, path, options = {}) => {
  requireEnv('SUPABASE_FUNCTIONS_URL', functionBaseUrl);

  return fetch(endpoint(functionName, path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
};

addCheck('auth missing -> 401 on protected Wave 3 family', async () => {
  const response = await request('food-catalog', '/api/v1/foods/search?query=milk');
  const payload = await readJson(response);

  assert.equal(response.status, 401);
  assert.equal(payload.error.code, 'unauthorized');
});

addCheck('non-member household access -> 403 when smoke env is configured', async () => {
  if (!nonMemberEmail || !nonMemberPassword || !householdId) {
    console.log(
      '  skip: set SMOKE_NON_MEMBER_EMAIL, SMOKE_NON_MEMBER_PASSWORD, SMOKE_HOUSEHOLD_ID',
    );
    return;
  }

  const token = await signIn(nonMemberEmail, nonMemberPassword);
  const response = await request('fridge-items', `/api/v1/households/${householdId}/fridge`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await readJson(response);

  assert.equal(response.status, 403);
  assert.equal(payload.error.code, 'forbidden');
});

addCheck('member endpoint-family sanity when smoke env is configured', async () => {
  if (!memberEmail || !memberPassword || !householdId) {
    console.log('  skip: set SMOKE_MEMBER_EMAIL, SMOKE_MEMBER_PASSWORD, SMOKE_HOUSEHOLD_ID');
    return;
  }

  const token = await signIn(memberEmail, memberPassword);
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const familyChecks = [
    ['food-catalog', '/api/v1/foods/search?query=milk'],
    ['fridge-items', `/api/v1/households/${householdId}/fridge`],
    ['diary', '/api/v1/diary/summary?date=2026-04-25'],
  ];

  for (const [functionName, path] of familyChecks) {
    const response = await request(functionName, path, { headers });
    const payload = await readJson(response);

    assert.notEqual(response.status, 401, `${functionName} returned unauthorized`);
    assert.notEqual(response.status, 403, `${functionName} returned forbidden`);
    assert.ok(payload, `${functionName} returned an empty body`);
  }
});

const main = async () => {
  let failed = 0;

  for (const check of checks) {
    process.stdout.write(`- ${check.name}\n`);

    try {
      await check.run();
    } catch (error) {
      failed += 1;
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }

  console.log(`Wave 3 smoke complete: ${checks.length} checks evaluated.`);
};

void main();
