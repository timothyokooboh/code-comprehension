import { defaultProductQuestionCount, questionCountSchema } from '@code-comprehension/quiz-contract';
import { z } from 'zod';

export const bankTracking = { git: 'git', local: 'local' } as const;
export const productStatuses = { setupRequired: 'setup_required', ready: 'ready', valid: 'valid', saved: 'saved' } as const;
export const configSchema = z.strictObject({ version: z.literal(1), bankTracking: z.enum(bankTracking), questionsPerSession: questionCountSchema.default(defaultProductQuestionCount) });
export type ProductConfig = z.infer<typeof configSchema>;
