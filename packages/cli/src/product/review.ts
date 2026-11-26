import { readFile } from 'node:fs/promises';
import type { Quiz } from '@code-comprehension/quiz-contract';
import { join } from 'node:path';
import { z } from 'zod';
import { CliError, cliErrorCodes } from '../errors.js';
import { readQuizData } from '../load-quiz.js';
import { architectureFocus, bankIdentifier } from './bank-contract.js';
import { cacheReasons, cacheStatuses, configuredProject, inspectProductCache } from './cache.js';
import { productPaths, writeAtomic } from './project.js';

export const reviewStatuses = { retained: 'retained' } as const;
const reviewSchema = z.strictObject({
  bankId: bankIdentifier,
  reviewToken: z.string().regex(/^[a-f0-9]{64}$/),
  confirmed: z.literal(true),
  reviewedFocus: z.literal(architectureFocus).optional(),
  references: z.array(z.strictObject({ questionId: z.string().min(1), referenceIndex: z.number().int().nonnegative(), line: z.number().int().positive() })),
});

function correctReferences(quiz: Quiz, updates: z.infer<typeof reviewSchema>['references']) {
  const questions = structuredClone(quiz.questions);
  const seen = new Set<string>();
  for (const update of updates) {
    const key = `${update.questionId}:${update.referenceIndex}`;
    const reference = questions.find(({ id }) => id === update.questionId)?.references[update.referenceIndex];
    if (!reference || seen.has(key)) throw new CliError(cliErrorCodes.productReviewInvalid);
    seen.add(key);
    reference.line = update.line;
  }
  return { ...quiz, questions };
}

async function validateReferenceLines(root: string, quiz: Quiz) {
  const lineCounts = new Map<string, number>();
  for (const question of quiz.questions) {
    for (const reference of question.references) {
      if (reference.line === undefined) continue;
      let count = lineCounts.get(reference.path);
      if (count === undefined) {
        try { count = (await readFile(join(root, reference.path), 'utf8')).split('\n').length; }
        catch (cause) { throw new CliError(cliErrorCodes.productSourcesUnavailable, { cause }); }
        lineCounts.set(reference.path, count);
      }
      if (reference.line > count) throw new CliError(cliErrorCodes.productReviewInvalid);
    }
  }
}

export async function retainProductBank(repo: string, input: string) {
  const receipt = reviewSchema.safeParse(await readQuizData(input));
  if (!receipt.success) throw new CliError(cliErrorCodes.productReviewInvalid);
  const review = receipt.data;
  const result = await inspectProductCache(repo, review.bankId);
  if (result.status !== cacheStatuses.reviewRequired || result.reviewToken !== review.reviewToken) {
    throw new CliError(cliErrorCodes.productReviewChanged);
  }
  if (result.reason === cacheReasons.architecture && review.reviewedFocus !== architectureFocus) {
    throw new CliError(cliErrorCodes.productReviewInvalid);
  }
  if (!result.current.length || result.current.some(({ hash }) => hash === null)) throw new CliError(cliErrorCodes.productSourcesUnavailable);
  const project = await configuredProject(repo);
  const quiz = correctReferences(result.bank.quiz, review.references);
  await validateReferenceLines(project.root, quiz);
  const verified = await inspectProductCache(repo, review.bankId);
  if (verified.status !== cacheStatuses.reviewRequired || verified.reviewToken !== review.reviewToken) {
    throw new CliError(cliErrorCodes.productReviewChanged);
  }
  const scope = result.reason === cacheReasons.architecture ? { ...result.bank.scope, focus: architectureFocus } : result.bank.scope;
  const retained = { ...result.bank, scope, quiz, sources: verified.current };
  await writeAtomic(join(project.root, productPaths.cache, `${review.bankId}.json`), `${JSON.stringify(retained, null, 2)}\n`);
  return { status: reviewStatuses.retained, conflicts: project.conflicts };
}
