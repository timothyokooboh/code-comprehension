import { z } from 'zod';
import { assessmentTypes, quizSchema, type Quiz } from '@code-comprehension/quiz-contract';

export const bankIdentifier = z.string().regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(1);
export const relativeSourcePath = text.regex(/^(?!\/|[A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/);
export const productScopeKinds = { module: 'module', general: 'general' } as const;
export const architectureFocus = 'system_architecture_v1' as const;
const scopeFields = {
  name: text, description: text,
  sourcePatterns: z.array(relativeSourcePath).min(1), supportingFiles: z.array(relativeSourcePath),
};
const moduleScope = z.strictObject({ ...scopeFields, kind: z.literal(productScopeKinds.module) });
const architectureScope = z.strictObject({ ...scopeFields, kind: z.literal(productScopeKinds.general), focus: z.literal(architectureFocus) });
// Older caches remain readable so an agent can review their meaning before reuse.
const cachedScope = z.discriminatedUnion('kind', [moduleScope, architectureScope.extend({ focus: z.literal(architectureFocus).optional() })]);
export const bankSchema = z.strictObject({
  version: z.literal(1), id: bankIdentifier,
  scope: z.discriminatedUnion('kind', [moduleScope, architectureScope]),
  quiz: quizSchema,
});
export type ProductBank = z.infer<typeof bankSchema>;
export const cacheFormatVersion = 2;
export const cachedBankSchema = bankSchema.extend({
  version: z.literal(cacheFormatVersion), scope: cachedScope,
  sources: z.array(z.strictObject({ path: relativeSourcePath, hash: z.string().regex(/^[a-f0-9]{64}$/) })).min(1),
});


export type CachedProductBank = z.infer<typeof cachedBankSchema>;
export type ProductSourceScope = Pick<ProductBank, 'quiz'> & { scope: z.infer<typeof cachedScope> };

export function isProductQuiz(quiz: Quiz) {
  return quiz.type === assessmentTypes.product && !quiz.comparison && !quiz.runtimeRevision && !quiz.attemptRevision && !quiz.selectionFormat && quiz.writtenCount === undefined &&
    quiz.questions.every((question) => question.references.every(({ path }) => relativeSourcePath.safeParse(path).success));
}
