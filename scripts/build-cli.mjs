import { build } from 'esbuild';
import { chmod, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../packages/cli/dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await build({
  absWorkingDir: projectRoot,
  entryPoints: ['packages/cli/src/index.ts'],
  outfile: 'packages/cli/dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external: ['open', 'commander'],
});
await cp(new URL('../apps/web/dist/', import.meta.url), new URL('web/', output), { recursive: true });
await chmod(new URL('index.js', output), 0o755);
