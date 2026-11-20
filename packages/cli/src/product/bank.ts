import { join } from 'node:path';
import { z } from 'zod';
import { assessmentTypes, quizSchema } from '@code-comprehension/quiz-contract';
import { QuizValidationError, readQuizData } from '../load-quiz.js';
import { CliError, cliErrorCodes } from '../errors.js';
import { reconcileProductSetup } from './config.js';
import { productStatuses } from './contract.js';
import { ensureProductDirectory, productPaths, writeAtomic } from './project.js';
import { inspectTracking } from './ignore.js';

const identifier = z.string().regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(1);
const relativePath = text.regex(/^(?!\/|[A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/);
export const productScopeKinds = { module: 'module', general: 'general' } as const;
const bankSchema = z.strictObject({
  version: z.literal(1), id: identifier,
  scope: z.strictObject({
    kind: z.enum(productScopeKinds), name: text, description: text,
    sourcePatterns: z.array(relativePath).min(1), supportingFiles: z.array(relativePath),
  }),
  quiz: quizSchema,
});

export async function loadProductBank(path: string) {
  const result = bankSchema.safeParse(await readQuizData(path));
  if (!result.success) throw new QuizValidationError(result.error.issues);
  const bank = result.data;
  if (bank.quiz.type !== assessmentTypes.product || bank.quiz.comparison ||
    bank.quiz.questions.some((question) => question.references.some((reference) => !relativePath.safeParse(reference.path).success))) {
    throw new CliError(cliErrorCodes.productBankInvalid);
  }
  return bank;
}

async function configuredProject(repo: string) {
  const status = await reconcileProductSetup(repo);
  if (!status.config) throw new CliError(cliErrorCodes.productSetupRequired);
  return { ...status, config: status.config };
}

export async function saveProductBank(repo: string, input: string) {
  const project = await configuredProject(repo);
  const bank = await loadProductBank(input);
  const relative = `${productPaths.cache}/${bank.id}.json`;
  try {
    await ensureProductDirectory(project.root, true);
    await writeAtomic(join(project.root, relative), `${JSON.stringify(bank, null, 2)}\n`);
  } catch (cause) { throw new CliError(cliErrorCodes.productStorageFailed, { cause }); }
  return { status: productStatuses.saved, path: relative, conflicts: await inspectTracking(project.root, project.config, relative) };
}

export async function productAssessment(repo: string, id: string) {
  if (!identifier.safeParse(id).success) throw new CliError(cliErrorCodes.productBankInvalid);
  const project = await configuredProject(repo);
  const bank = await loadProductBank(join(project.root, productPaths.cache, `${id}.json`));
  return { ...bank.quiz, scope: [bank.scope.name] };
}
