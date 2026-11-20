import { join } from 'node:path';
import { lstat } from 'node:fs/promises';
import { CliError, cliErrorCodes } from '../errors.js';
import { messages } from '../locales/en.js';
import { productPaths, projectGit, readOptional, writeAtomic } from './project.js';
import { bankTracking, type ProductConfig } from './contract.js';

const managedRule = `\n# code-comprehension managed cache\n/${productPaths.cache}/\n# end code-comprehension managed cache\n`;
const escapedRule = managedRule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const managedPattern = new RegExp(escapedRule.replace(/\n/g, '\\r?\\n'), 'g');
export const trackingConflicts = { configIgnored: 'config_ignored', cacheIgnored: 'cache_ignored', cacheTracked: 'cache_tracked' } as const;
type ConflictCode = typeof trackingConflicts[keyof typeof trackingConflicts];
type TrackingConflict = { code: ConflictCode; message: string; rule: string };

export async function reconcileIgnore(root: string, config: ProductConfig) {
  const path = join(root, '.gitignore');
  const original = await readOptional(path) ?? '';
  const unmanaged = original.replace(managedPattern, '');
  const next = config.bankTracking === bankTracking.local ? unmanaged + managedRule : unmanaged;
  if (next === original) return;
  try {
    if (original && !(await lstat(path)).isFile()) throw new CliError(cliErrorCodes.productStorageFailed);
    await writeAtomic(path, next);
  } catch (cause) {
    if (cause instanceof CliError) throw cause;
    throw new CliError(cliErrorCodes.productStorageFailed, { cause });
  }
}

async function ignoredRule(root: string, path: string) {
  const ignored = await projectGit(root, ['check-ignore', '--no-index', '--', path], 1);
  return ignored ? (await projectGit(root, ['check-ignore', '--no-index', '-v', '--', path], 1)).trim() : '';
}

export async function inspectTracking(root: string, config: ProductConfig, bankPath?: string) {
  const conflicts: TrackingConflict[] = [];
  const add = (code: ConflictCode, rule: string) => conflicts.push({ code, message: messages.product.conflicts[code], rule });
  const configRule = await ignoredRule(root, productPaths.config);
  if (configRule) add(trackingConflicts.configIgnored, configRule);
  if (config.bankTracking === bankTracking.git) {
    const cacheRule = await ignoredRule(root, bankPath ?? `${productPaths.cache}/bank.json`);
    if (cacheRule) add(trackingConflicts.cacheIgnored, cacheRule);
  } else {
    const tracked = await projectGit(root, ['ls-files', '--', productPaths.cache]);
    if (tracked) add(trackingConflicts.cacheTracked, tracked.trim());
  }
  return conflicts;
}
