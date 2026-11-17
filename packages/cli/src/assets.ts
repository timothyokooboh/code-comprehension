import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { CliError, cliErrorCodes } from './errors.js';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export async function loadAssets(directory: string) {
  const assets = new Map<string, { body: Buffer; contentType: string }>();

  async function visit(folder: string, prefix: string) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const location = join(folder, entry.name);
      const route = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        await visit(location, route);
      } else if (entry.isFile()) {
        assets.set(route, {
          body: await readFile(location),
          contentType: contentTypes[extname(entry.name)] ?? 'application/octet-stream',
        });
      }
    }
  }

  try {
    await visit(directory, '');
  } catch (cause) {
    throw new CliError(cliErrorCodes.uiMissing, { cause });
  }
  const index = assets.get('/index.html');
  if (!index) throw new CliError(cliErrorCodes.uiMissing);
  assets.set('/', index);
  return assets;
}
