import { z } from 'zod';
import { sourceReferenceSchema, writtenQuestionSchema } from './quiz.ts';

export const reviewPaths = {
  session: '/api/review/session', state: '/api/review/state', submit: '/api/review/submit',
  wait: '/api/review/wait', feedback: '/api/review/feedback', failure: '/api/review/failure',
} as const;
export const reviewTimings = { waitMs: 45_000, leaseMs: 120_000, pollMs: 1_500, requestMs: 5_000, retentionMs: 24 * 60 * 60 * 1_000 } as const;
export const reviewLimits = { answerCharacters: 8_000, feedbackCharacters: 8_000, requestBytes: 128 * 1024 } as const;
export const reviewStates = { waiting: 'waiting', reviewing: 'reviewing', disconnected: 'disconnected', completed: 'completed', failed: 'failed' } as const;
export const reviewErrors = { invalid: 'review_invalid', stale: 'review_stale', forbidden: 'review_forbidden', unavailable: 'review_unavailable', recovery: 'review_recovery', expired: 'review_expired', active: 'review_active', storage: 'review_storage', address: 'review_address' } as const;
export type ReviewErrorCode = typeof reviewErrors[keyof typeof reviewErrors];
export const reviewVerdicts = { correct: 'correct', partial: 'partial', incorrect: 'incorrect', uncertain: 'uncertain' } as const;
export const reviewProtocolVersion = 1;
export const reviewJobStates = { timeout: 'timeout', submitted: 'submitted', completed: 'completed' } as const;
const identity = { protocolVersion: z.literal(reviewProtocolVersion), sessionId: z.uuid(), revision: z.uuid(), attemptId: z.uuid(), submissionId: z.uuid() };
const text = z.string().trim().min(1).max(reviewLimits.feedbackCharacters);
export const reviewIdentitySchema = z.strictObject(identity);
export const reviewSubmissionSchema = z.strictObject({
  ...identity, questionIds: z.array(z.string()).min(1),
  answers: z.record(z.string(), z.array(z.string().max(reviewLimits.answerCharacters)).min(1)),
});
export const writtenFeedbackSchema = z.strictObject({
  questionId: z.string().min(1), verdict: z.enum(reviewVerdicts),
  summary: text, understood: text, missing: text,
  references: z.array(sourceReferenceSchema).min(1),
});
export const reviewFailureSchema = z.strictObject({ ...identity, leaseId: z.uuid() });
export const reviewFeedbackSchema = z.strictObject({ ...identity, leaseId: z.uuid(), reviews: z.array(writtenFeedbackSchema).min(1) });
export const reviewSnapshotSchema = z.strictObject({
  status: z.enum(reviewStates), submission: reviewSubmissionSchema.nullable(), feedback: reviewFeedbackSchema.nullable(),
});
export const reviewSessionSchema = z.strictObject({ protocolVersion: z.literal(reviewProtocolVersion), sessionId: z.uuid(), token: z.string().min(1), revision: z.uuid() });
export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
export type ReviewFeedback = z.infer<typeof reviewFeedbackSchema>;
export type WrittenFeedback = z.infer<typeof writtenFeedbackSchema>;
export type ReviewSnapshot = z.infer<typeof reviewSnapshotSchema>;
export type ReviewSession = z.infer<typeof reviewSessionSchema>;

export const reviewJobSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal(reviewJobStates.timeout) }),
  z.strictObject({ status: z.literal(reviewJobStates.completed) }),
  z.strictObject({ status: z.literal(reviewJobStates.submitted), leaseId: z.uuid(), submission: reviewSubmissionSchema, questions: z.array(writtenQuestionSchema).min(1) }),
]);
