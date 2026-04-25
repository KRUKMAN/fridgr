const fs = require('node:fs');
const path = require('node:path');

const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
const publicFunctionSlugs = new Set(['health-check']);

const getFunctionEntrypoints = () =>
  fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== '_shared')
    .map((name) => ({
      entrypoint: path.join(functionsDir, name, 'index.ts'),
      isPublic: publicFunctionSlugs.has(name),
      slug: name,
    }))
    .filter(({ entrypoint }) => fs.existsSync(entrypoint));

const missingAuth = getFunctionEntrypoints().filter(({ entrypoint, isPublic }) => {
  if (isPublic) {
    return false;
  }

  const source = fs.readFileSync(entrypoint, 'utf8');
  return !source.includes('withAuth');
});

if (missingAuth.length > 0) {
  console.error(
    [
      'Expected every non-public Edge Function entrypoint to include withAuth.',
      ...missingAuth.map(({ slug, entrypoint }) => `- ${slug}: ${entrypoint}`),
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  `Verified withAuth imports for ${getFunctionEntrypoints().length - publicFunctionSlugs.size} protected Edge Function entrypoints.`,
);
