import { readFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, matchesGlob, relative, isAbsolute, sep } from 'node:path';
import { projectGit } from './project.js';
import type { ProductSourceScope } from './bank-contract.js';
import { CliError, cliErrorCodes } from '../errors.js';

const excludedDirectories = new Set(['.git', '.comprehension', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt']);
const isExcluded = (path: string) => path.split('/').some((part) => excludedDirectories.has(part));
const normalise = (path: string) => path.replace(/^\.\//, '').replace(/\/$/, '');

async function fingerprint(root: string, path: string) {
  try {
    const resolved = relative(await realpath(root), await realpath(join(root, path)));
    if (resolved.split(sep)[0] === '..' || isAbsolute(resolved) || isExcluded(resolved.split(sep).join('/'))) throw new CliError(cliErrorCodes.productSourcesUnavailable);
    if (!(await lstat(join(root, path))).isFile()) throw new CliError(cliErrorCodes.productSourcesUnavailable);
    return createHash('sha256').update(await readFile(join(root, path))).digest('hex');
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'ENOENT') return null;
    throw new CliError(cliErrorCodes.productSourcesUnavailable, { cause });
  }
}

export async function captureSourceInventory(root: string, scope: ProductSourceScope['scope'], references: string[] = []) {
  const paths = (await projectGit(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
  const patterns = scope.sourcePatterns.map(normalise);
  const selected = paths.filter((path) => !isExcluded(path) && patterns.some((pattern) =>
    pattern === '.' || matchesGlob(path, pattern) || path.startsWith(`${pattern}/`)));
  const supporting = [...scope.supportingFiles, ...references].map(normalise);
  if (supporting.some(isExcluded)) throw new CliError(cliErrorCodes.productSourcesUnavailable);
  const inventory = [...new Set([...selected, ...supporting])].sort();
  const sources = [];
  for (const path of inventory) {
    const hash = await fingerprint(root, path);
    if (hash !== null || supporting.includes(path)) sources.push({ path, hash });
  }
  return sources;
}

export async function captureSources(root: string, bank: ProductSourceScope) {
  return captureSourceInventory(root, bank.scope, bank.quiz.questions.flatMap(question => question.references.map(reference => reference.path)));
}
