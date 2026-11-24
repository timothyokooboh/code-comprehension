import { z } from 'zod';
import { quizSchema, questionCountSchema, questionFormatSchema } from './quiz.ts';

export const assessmentPaths = {
  active: '/api/assessment', view: '/api/assessment/view', revise: '/api/assessment/revise',
} as const;
export const assessmentSourceKinds = { file: 'file', pr: 'pr', product: 'product' } as const;
const productSelectionShape = {
  questionsPerSession: questionCountSchema.optional(),
  format: questionFormatSchema.optional(),
  writtenCount: questionCountSchema.optional(),
};
export const productSelectionSchema = z.strictObject(productSelectionShape);
export type ProductSelectionOptions = z.infer<typeof productSelectionSchema>;
export const assessmentSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal(assessmentSourceKinds.file) }),
  z.strictObject({ kind: z.literal(assessmentSourceKinds.pr), directory: z.string().min(1) }),
  z.strictObject({ kind: z.literal(assessmentSourceKinds.product), repo: z.string().min(1), bankIds: z.array(z.string().min(1)).min(1), ...productSelectionShape }),
]);
export type AssessmentSource = z.infer<typeof assessmentSourceSchema>;
export const revisionInputSchema = z.union([
  z.strictObject({ quizPath: z.string().min(1) }),
  z.strictObject({ bankIds: z.array(z.string().min(1)).min(1), ...productSelectionShape }),
]);
export type RevisionInput = z.infer<typeof revisionInputSchema>;
export const revisionRequestSchema = z.strictObject({
  revision: z.uuid(), displayToken: z.uuid().nullable(), input: revisionInputSchema,
});
export const displayRequestSchema = z.strictObject({ revision: z.uuid(), attemptId: z.uuid().optional(), questionIds: z.array(z.string().min(1)).min(1) });
export const activeAssessmentSchema = z.strictObject({
  revision: z.uuid(), displayToken: z.uuid().nullable(), source: assessmentSourceSchema,
  displayed: z.array(z.strictObject({ number: z.number().int().positive(), id: z.string().min(1) })),
  quiz: quizSchema.nullable(),
});

export type DisplayRequest = z.infer<typeof displayRequestSchema>;
