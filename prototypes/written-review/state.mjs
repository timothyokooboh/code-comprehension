import { publicQuestions, validAnswers, validReviews, questionTypes } from './contract.mjs';
import { randomUUID } from 'node:crypto';
export const timings = { waitMs: 45_000, reviewLeaseMs: 120_000, pollMs: 1_500, requestMs: 5_000 };
export const limits = { bodyBytes: 32_768, answerCharacters: 8_000, feedbackCharacters: 8_000 };
export class ReviewError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function createReviewState(questions, now = Date.now) {
  let submission = null;
  let feedback = null;
  let listener = null;
  let leaseUntil = 0;
  function reviewer() {
    if (feedback) return 'completed';
    if (listener) return 'waiting';
    return now() < leaseUntil ? 'reviewing' : 'disconnected';
  }
  function snapshot() { return { questions: publicQuestions(questions), submission, feedback, reviewer: reviewer() }; }
  function submit(value) {
    if (!value || typeof value.id !== 'string' || !/^[a-f0-9-]{36}$/.test(value.id) || !validAnswers(value.answers, questions, limits.answerCharacters)) throw new ReviewError('invalid_request');
    if (submission) {
      if (submission.id === value.id && JSON.stringify(submission.answers) === JSON.stringify(value.answers)) return snapshot();
      throw new ReviewError('conflict', 409);
    }
    submission = { id: value.id, answers: value.answers };
    listener?.deliver();
    return snapshot();
  }
  function wait(signal) {
    if (listener) throw new ReviewError('conflict', 409);
    if (feedback) return Promise.resolve({ status: 'completed' });
    function job() { leaseUntil = now() + timings.reviewLeaseMs; return { status: 'submitted', submission: { id: submission.id, answers: Object.fromEntries(questions.filter(q => q.type === questionTypes.written).map(q => [q.id, submission.answers[q.id]])) }, questions: questions.filter(q => q.type === questionTypes.written) }; }
    if (submission) return Promise.resolve(job());
    return new Promise((resolve) => {
      const id = randomUUID();
      function finish(result) {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        if (listener?.id === id) listener = null;
        resolve(result);
      }
      function abort() { finish({ status: 'cancelled' }); }
      const timer = setTimeout(() => finish({ status: 'timeout' }), timings.waitMs);
      listener = { id, deliver: () => finish(job()) };
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  function review(value) {
    if (!submission || value?.submissionId !== submission.id) throw new ReviewError('conflict', 409);
    if (!validReviews(value.reviews, questions, limits.feedbackCharacters)) throw new ReviewError('invalid_request');
    const next = { submissionId: value.submissionId, reviews: value.reviews };
    if (feedback && JSON.stringify(feedback) !== JSON.stringify(next)) throw new ReviewError('conflict', 409);
    feedback = next;
    return snapshot();
  }
  return { snapshot, submit, wait, review };
}
