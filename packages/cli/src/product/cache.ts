import { createReviewToken } from './review-token.js';
import { join } from 'node:path';
import { CliError, cliErrorCodes } from '../errors.js';
import { reconcileProductSetup } from './config.js';
import { bankIdentifier, cachedBankSchema, isProductQuiz, type ProductBank } from './bank-contract.js';
import { productPaths, readOptional } from './project.js';
import { captureSources } from './sources.js';

export const cacheStatuses = { reviewRequired: 'review_required', reusable: 'reusable', generationRequired: 'generation_required' } as const;
export const cacheReasons = { missing: 'missing', incompatible: 'incompatible', changed: 'changed', refresh: 'refresh', unavailable: 'sources_unavailable' } as const;

export async function configuredProject(repo: string) {
  const status = await reconcileProductSetup(repo);
  if (!status.config) throw new CliError(cliErrorCodes.productSetupRequired);
  return { ...status, config: status.config };
}

export async function inspectProductCache(repo: string, id: string, refresh = false) {
  if (!bankIdentifier.safeParse(id).success) throw new CliError(cliErrorCodes.productBankInvalid);
  const project = await configuredProject(repo);
  const required = (reason: typeof cacheReasons[keyof typeof cacheReasons], changedFiles: string[] = []) =>
    ({ status: cacheStatuses.generationRequired, reason, changedFiles, conflicts: project.conflicts } as const);
  if (refresh) return required(cacheReasons.refresh);
  const content = await readOptional(join(project.root, productPaths.cache, `${id}.json`));
  if (content === undefined) return required(cacheReasons.missing);
  let raw: unknown;
  try { raw = JSON.parse(content); } catch { return required(cacheReasons.incompatible); }
  const parsed = cachedBankSchema.safeParse(raw);
  if (!parsed.success || parsed.data.id !== id || !isProductQuiz(parsed.data.quiz)) return required(cacheReasons.incompatible);
  const bank = parsed.data;
  const input: ProductBank = { ...bank, version: 1 };
  let current;
  try { current = await captureSources(project.root, input); }
  catch (error) {
    if (error instanceof CliError && error.code === cliErrorCodes.productSourcesUnavailable) return required(cacheReasons.unavailable);
    throw error;
  }
  const previous = new Map(bank.sources.map(({ path, hash }) => [path, hash]));
  const next = new Map(current.map(({ path, hash }) => [path, hash]));
  const changedFiles = [...new Set([...previous.keys(), ...next.keys()])].filter((path) => previous.get(path) !== next.get(path));
  if (changedFiles.length) return { status: cacheStatuses.reviewRequired, reason: cacheReasons.changed, changedFiles, reviewToken: createReviewToken(bank, current), bank, current, conflicts: project.conflicts } as const;
  return { status: cacheStatuses.reusable, bank, conflicts: project.conflicts } as const;
}
