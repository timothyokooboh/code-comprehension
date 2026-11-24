import { randomUUID } from 'node:crypto';
import { validQuestionSelection, questionTypes, reviewJobStates, reviewErrors, reviewStates, reviewTimings, reviewSubmissionSchema, reviewFeedbackSchema, reviewFailureSchema, reviewRetakeSchema,
  type ReviewErrorCode, type ReviewSubmission, type ReviewFeedback, type ReviewSnapshot, type Quiz } from '@code-comprehension/quiz-contract';
import type { z } from 'zod';

export class ReviewError extends Error {
  constructor(public code: ReviewErrorCode, public issues?: z.core.$ZodIssue[]) { super(code); }
}
export type SavedReview = { sessionId: string; submission: ReviewSubmission | null; feedback: ReviewFeedback | null; failed?: boolean; attemptId?: string; questionIds?: string[] };
export function createWrittenReview(getQuiz: () => Quiz | null, saved?: SavedReview,
  persist: (value: SavedReview) => void = () => {}) {
  const sessionId = saved?.sessionId ?? randomUUID();
  let submission: ReviewSubmission | null = saved?.submission ?? null;
  let feedback: ReviewFeedback | null = saved?.feedback ?? null;
  let failed = saved?.failed ?? false;
  let attemptId = saved?.attemptId ?? saved?.submission?.attemptId ?? randomUUID();
  let questionIds = saved?.questionIds ?? saved?.submission?.questionIds ?? [];
  let leaseUntil = 0;
  let leaseId: string | null = null;
  let listener: (() => void) | null = null;

  function assertRevision(revision: string) {
    if (getQuiz()?.runtimeRevision !== revision) throw new ReviewError(reviewErrors.stale);
  }
  function snapshot(): ReviewSnapshot {
    if (submission) assertRevision(submission.revision);
    return { attemptId, questionIds, revision: getQuiz()?.runtimeRevision, submission, feedback, status: feedback ? reviewStates.completed
      : failed ? reviewStates.failed : Date.now() < leaseUntil ? reviewStates.reviewing : listener ? reviewStates.waiting : reviewStates.disconnected };
  }
  function submit(input: unknown) {
    const parsed = reviewSubmissionSchema.safeParse(input);
    if (!parsed.success) throw new ReviewError(reviewErrors.invalid, parsed.error.issues);
    const value = parsed.data;
    assertRevision(value.revision);
    if (value.sessionId !== sessionId || value.attemptId !== attemptId) throw new ReviewError(reviewErrors.stale);
    if (questionIds.length && JSON.stringify(value.questionIds) !== JSON.stringify(questionIds)) throw new ReviewError(reviewErrors.stale);
    const questions = getQuiz()!.questions;
    if (!validQuestionSelection(getQuiz()!, value.questionIds) ||
      Object.keys(value.answers).length !== value.questionIds.length ||
      !value.questionIds.some(id => questions.find(q => q.id === id)?.type === questionTypes.written)) throw new ReviewError(reviewErrors.invalid);
    for (const id of value.questionIds) {
      const question = questions.find(q => q.id === id);
      const answer = value.answers[id];
      if (!question || !answer) throw new ReviewError(reviewErrors.invalid);
      if (question.type === questionTypes.written) {
        if (answer.length !== 1 || !answer[0]?.trim()) throw new ReviewError(reviewErrors.invalid);
      } else if (new Set(answer).size !== answer.length || (question.type === questionTypes.single && answer.length !== 1) ||
        answer.some(option => !question.options.some(item => item.id === option))) throw new ReviewError(reviewErrors.invalid);
    }
    if (submission) {
      if (JSON.stringify(submission) !== JSON.stringify(value)) throw new ReviewError(reviewErrors.stale);
      return snapshot();
    }
    persist({ sessionId, attemptId, questionIds: value.questionIds, submission: value, feedback });
    questionIds = value.questionIds;
    submission = value;
    listener?.();
    return snapshot();
  }
  function job() {
    if (!submission || Date.now() < leaseUntil) return { status: reviewJobStates.timeout };
    assertRevision(submission.revision);
    persist({ sessionId, attemptId, questionIds, submission, feedback, failed: false });
    failed = false;
    leaseId = randomUUID();
    leaseUntil = Date.now() + reviewTimings.leaseMs;
    return { status: reviewJobStates.submitted, leaseId, submission,
      questions: getQuiz()!.questions.filter(q => q.type === questionTypes.written && submission!.questionIds.includes(q.id)) };
  }
  async function wait(signal: AbortSignal) {
    if (signal.aborted) return { status: reviewJobStates.timeout };
    if (listener) throw new ReviewError(reviewErrors.stale);
    if (submission && !feedback && Date.now() >= leaseUntil) return job();
    await new Promise<void>(resolve => {
      function finish() {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        listener = null;
        resolve();
      }
      const timer = setTimeout(finish, submission && !feedback ? Math.min(reviewTimings.waitMs, Math.max(1, leaseUntil - Date.now())) : reviewTimings.waitMs);
      listener = finish;
      signal.addEventListener('abort', finish, { once: true });
      if (signal.aborted) finish();
    });
    return signal.aborted || feedback ? { status: reviewJobStates.timeout } : job();
  }
  function validateFeedback(input: unknown) {
    const parsed = reviewFeedbackSchema.safeParse(input);
    if (!parsed.success) throw new ReviewError(reviewErrors.invalid, parsed.error.issues);
    const value = parsed.data;
    assertRevision(value.revision);
    if (!submission || value.sessionId !== sessionId || value.revision !== submission.revision ||
      value.attemptId !== submission.attemptId || value.submissionId !== submission.submissionId) throw new ReviewError(reviewErrors.stale);
    const questions = getQuiz()!.questions.filter(q => q.type === questionTypes.written && submission!.questionIds.includes(q.id));
    if (value.reviews.length !== questions.length || new Set(value.reviews.map(r => r.questionId)).size !== questions.length) throw new ReviewError(reviewErrors.invalid);
    for (const item of value.reviews) {
      const question = questions.find(q => q.id === item.questionId);
      if (!question || item.references.some(ref => !question.references.some(source => source.path === ref.path && source.line === ref.line))) throw new ReviewError(reviewErrors.invalid);
    }
    if (feedback && JSON.stringify(feedback) !== JSON.stringify(value)) throw new ReviewError(reviewErrors.stale);
    return value;
  }
  function review(input: unknown) {
    const value = validateFeedback(input);
    if (feedback) return snapshot();
    if (value.leaseId !== leaseId) throw new ReviewError(reviewErrors.stale);
    persist({ sessionId, attemptId, questionIds, submission, feedback: value });
    feedback = value;
    return snapshot();
  }
  function fail(input: unknown) {
    const parsed = reviewFailureSchema.safeParse(input);
    if (!parsed.success) throw new ReviewError(reviewErrors.invalid, parsed.error.issues);
    const value = parsed.data;
    if (!submission || feedback || value.leaseId !== leaseId || value.sessionId !== sessionId || value.revision !== submission.revision ||
      value.attemptId !== submission.attemptId || value.submissionId !== submission.submissionId) throw new ReviewError(reviewErrors.stale);
    assertRevision(value.revision);
    persist({ sessionId, attemptId, questionIds, submission, feedback, failed: true });
    failed = true;
    leaseId = null;
    leaseUntil = 0;
    listener?.();
    return snapshot();
  }
  function reset(value: Pick<ReviewSnapshot, 'attemptId' | 'questionIds'>) {
    attemptId = value.attemptId;
    questionIds = value.questionIds;
    submission = null;
    feedback = null;
    failed = false;
    leaseId = null;
    leaseUntil = 0;
    listener?.();
  }
  function retake(input: unknown) {
    const parsed = reviewRetakeSchema.safeParse(input);
    if (!parsed.success) throw new ReviewError(reviewErrors.invalid, parsed.error.issues);
    const value = parsed.data;
    assertRevision(value.revision);
    if (value.sessionId !== sessionId || value.nextAttemptId === value.attemptId) throw new ReviewError(reviewErrors.stale);
    if (value.nextAttemptId === attemptId && JSON.stringify(value.questionIds) === JSON.stringify(questionIds)) return snapshot();
    if (value.attemptId !== attemptId) throw new ReviewError(reviewErrors.stale);
    if (!getQuiz() || !validQuestionSelection(getQuiz()!, value.questionIds)) throw new ReviewError(reviewErrors.invalid);
    const next = { sessionId, attemptId: value.nextAttemptId, questionIds: value.questionIds, submission: null, feedback: null, failed: false };
    persist(next);
    reset(next);
    return snapshot();
  }
  return { sessionId, snapshot, submit, wait, review, fail, validateFeedback, retake, reset, revision: () => getQuiz()?.runtimeRevision };
}
export type WrittenReview = ReturnType<typeof createWrittenReview>;
