const { spawnSync } = require('node:child_process');

const env = {
  ...process.env,
  FRIDGR_REQUIRE_DB_TESTS: '1',
};

const result = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--test',
    'supabase/functions/tests/events/eventSystem.integration.test.ts',
  ],
  {
    stdio: 'inherit',
    env,
  },
);

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
