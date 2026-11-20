import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rename, rm, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CliError, cliErrorCodes } from '../errors.js';

const execute = promisify(execFile);
const gitTimeoutMs = 15_000;
export const productPaths = { directory: '.comprehension', config: '.comprehension/config.json', cache: '.comprehension/cache' } as const;

export async function projectGit(repo: string, args: string[], allowedExitCode?: number) {
  try {
    return (await execute('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: gitTimeoutMs })).stdout;
  } catch (cause) {
    if (allowedExitCode !== undefined && typeof cause === 'object' && cause !== null &&
      'code' in cause && cause.code === allowedExitCode && 'stdout' in cause && typeof cause.stdout === 'string') return cause.stdout;
    throw new CliError(cliErrorCodes.gitFailed, { cause });
  }
}

export async function projectRoot(repo: string) {
  return (await projectGit(repo, ['rev-parse', '--show-toplevel'])).trim();
}

export async function readOptional(path: string) {
  try { return await readFile(path, 'utf8'); }
  catch (cause) {
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'ENOENT') return undefined;
    throw new CliError(cliErrorCodes.productStorageFailed, { cause });
  }
}

export async function ensureProductDirectory(root: string, cache = false) {
  for (const relative of cache ? [productPaths.directory, productPaths.cache] : [productPaths.directory]) {
    const directory = join(root, relative);
    await mkdir(directory, { recursive: true });
    if (!(await lstat(directory)).isDirectory()) throw new CliError(cliErrorCodes.productStorageFailed);
  }
}

export async function writeAtomic(path: string, content: string) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  let failure: unknown;
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, path);
  } catch (cause) { failure = cause; }
  try { await rm(temporary, { force: true }); }
  catch (cause) { failure = failure ? new AggregateError([failure, cause]) : cause; }
  if (failure) throw new CliError(cliErrorCodes.productStorageFailed, { cause: failure });
}
