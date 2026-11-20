import { z } from 'zod';
import { assessmentTypes, quizSchema, type Quiz } from '@code-comprehension/quiz-contract';

export const bankIdentifier = z.string().regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(1);
export const relativeSourcePath = text.regex(/^(?!\/|[A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/);
export const productScopeKinds = { module: 'module', general: 'general' } as const;
export const bankSchema = z.strictObject({
  version: z.literal(1), id: bankIdentifier,
  scope: z.strictObject({
    kind: z.enum(productScopeKinds), name: text, description: text,
    sourcePatterns: z.array(relativeSourcePath).min(1), supportingFiles: z.array(relativeSourcePath),
  }),
  quiz: quizSchema,
});
export type ProductBank = z.infer<typeof bankSchema>;
export const cacheFormatVersion = 2;
export const cachedBankSchema = bankSchema.extend({
  version: z.literal(cacheFormatVersion),
  sources: z.array(z.strictObject({ path: relativeSourcePath, hash: z.string().regex(/^[a-f0-9]{64}$/) })).min(1),
});


export function isProductQuiz(quiz: Quiz) {
  return quiz.type === assessmentTypes.product && !quiz.comparison &&
    quiz.questions.every((question) => question.references.every(({ path }) => relativeSourcePath.safeParse(path).success));
}
