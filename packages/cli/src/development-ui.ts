import { createRequire } from 'node:module';
import { access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Server } from 'node:http';
import type { createServer } from 'vite';
import { CliError, cliErrorCodes } from './errors.js';

export async function startDevelopmentUi(directory: string, server: Server) {
  try {
    const root = resolve(directory);
    await access(join(root, 'index.html'));
    // Resolve from the developer's UI workspace; Vite is not a runtime dependency.
    const require = createRequire(join(root, 'package.json'));
    const vite = await import(pathToFileURL(require.resolve('vite')).href) as { createServer: typeof createServer };
    return await vite.createServer({
      root,
      server: { middlewareMode: true, hmr: { server }, cors: false },
    });
  } catch (cause) {
    throw new CliError(cliErrorCodes.developmentUiUnavailable, { cause });
  }
}
