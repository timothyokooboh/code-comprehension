import { join } from 'node:path';
import { composeProductBanks } from './composition.js';
import { QuizValidationError, readQuizData } from '../load-quiz.js';
import { CliError, cliErrorCodes } from '../errors.js';
import { bankSchema, cacheFormatVersion, isProductQuiz } from './bank-contract.js';
import { configuredProject, inspectProductCache, cacheStatuses } from './cache.js';
import { captureSources } from './sources.js';
import { productStatuses } from './contract.js';
import { ensureProductDirectory, productPaths, writeAtomic } from './project.js';
import { inspectTracking } from './ignore.js';

export async function loadProductBank(path: string) {
  const result = bankSchema.safeParse(await readQuizData(path));
  if (!result.success) throw new QuizValidationError(result.error.issues);
  const bank = result.data;
  if (!isProductQuiz(bank.quiz)) throw new CliError(cliErrorCodes.productBankInvalid);
  return bank;
}

export async function saveProductBank(repo: string, input: string) {
  const project = await configuredProject(repo);
  const bank = await loadProductBank(input);
  const sources = await captureSources(project.root, bank);
  if (!sources.length || sources.some(({ hash }) => hash === null)) throw new CliError(cliErrorCodes.productSourcesUnavailable);
  const cached = { ...bank, version: cacheFormatVersion, sources };
  const relative = `${productPaths.cache}/${bank.id}.json`;
  try {
    await ensureProductDirectory(project.root, true);
    await writeAtomic(join(project.root, relative), `${JSON.stringify(cached, null, 2)}\n`);
  } catch (cause) { throw new CliError(cliErrorCodes.productStorageFailed, { cause }); }
  return { status: productStatuses.saved, path: relative, conflicts: await inspectTracking(project.root, project.config, relative) };
}

export async function productAssessment(repo: string, ids: string[]) {
  const banks = [];
  for (const id of [...new Set(ids)].sort()) {
    const result = await inspectProductCache(repo, id);
    if (result.status === cacheStatuses.reviewRequired) throw new CliError(cliErrorCodes.productReviewRequired);
    if (result.status !== cacheStatuses.reusable) throw new CliError(cliErrorCodes.productGenerationRequired);
    banks.push(result.bank);
  }
  return composeProductBanks(banks);
}
