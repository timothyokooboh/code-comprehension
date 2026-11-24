import { randomUUID } from 'node:crypto';
import { validQuestionSelection, questionTypes, reviewJobStates, reviewErrors, reviewStates, reviewTimings, reviewSubmissionSchema, reviewFeedbackSchema,
  type ReviewErrorCode, type ReviewSubmission, type ReviewFeedback, type ReviewSnapshot, type Quiz } from '@code-comprehension/quiz-contract';
import type { z } from 'zod';

export class ReviewError extends Error {
  constructor(public code: ReviewErrorCode, public issues?: z.core.$ZodIssue[]) { super(code); }
}
export function createWrittenReview(getQuiz: () => Quiz | null) {
  const sessionId = randomUUID();
  let submission: ReviewSubmission | null = null;
  let feedback: ReviewFeedback | null = null;
  let leaseUntil = 0;
  let listener: (() => void) | null = null;

  function assertRevision(revision: string) {
    if (getQuiz()?.runtimeRevision !== revision) throw new ReviewError(reviewErrors.stale);
  }
  function snapshot(): ReviewSnapshot {
    if (submission) assertRevision(submission.revision);
    return { submission, feedback, status: feedback ? reviewStates.completed
      : listener ? reviewStates.waiting : Date.now() < leaseUntil ? reviewStates.reviewing : reviewStates.disconnected };
  }
  function submit(input: unknown) {
    const parsed = reviewSubmissionSchema.safeParse(input);
    if (!parsed.success) throw new ReviewError(reviewErrors.invalid, parsed.error.issues);
    const value = parsed.data;
    assertRevision(value.revision);
    if (value.sessionId !== sessionId) throw new ReviewError(reviewErrors.stale);
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
    submission = value;
    listener?.();
    return snapshot();
  }
  function job() {
    if (!submission) return { status: reviewJobStates.timeout };
    assertRevision(submission.revision);
    leaseUntil = Date.now() + reviewTimings.leaseMs;
    return { status: reviewJobStates.submitted, submission,
      questions: getQuiz()!.questions.filter(q => q.type === questionTypes.written && submission!.questionIds.includes(q.id)) };
  }
  async function wait(signal: AbortSignal) {
    if (listener) throw new ReviewError(reviewErrors.stale);
    if (submission && !feedback) return job();
    await new Promise<void>(resolve => {
      function finish() {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        listener = null;
        resolve();
      }
      const timer = setTimeout(finish, reviewTimings.waitMs);
      listener = finish;
      signal.addEventListener('abort', finish, { once: true });
      if (signal.aborted) finish();
    });
    return feedback ? { status: reviewJobStates.timeout } : job();
  }
  function review(input: unknown) {
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
    feedback = value;
    return snapshot();
  }
  return { sessionId, snapshot, submit, wait, review, revision: () => getQuiz()?.runtimeRevision };
}
export type WrittenReview = ReturnType<typeof createWrittenReview>;
