import { reviewStates, type Quiz, type AssessmentSource } from '@code-comprehension/quiz-contract';
import { createAssessmentState } from '../assessment/state.js';
import { loadRevision } from '../assessment/source.js';
import { CliError, cliErrorCodes } from '../errors.js';
import { openRecovery } from './recovery.js';
import { createWrittenReview } from './state.js';

/** Owns the atomic boundary between assessment identity, accepted work, and recovery. */
export function createReviewSession(quiz: Quiz | null, source: AssessmentSource, resumeFile?: string) {
  const recovery = openRecovery(resumeFile);
  const tokens = recovery.tokens;
  let url = recovery.data?.url ?? '';
  const state = createAssessmentState(quiz, source, loadRevision, recovery.data?.assessment, assessment => {
    const snapshot = review.snapshot();
    if (snapshot.submission && assessment.revision !== state.snapshot().revision) throw new CliError(cliErrorCodes.assessmentStale);
    recovery.save({ version: 1, sessionId: review.sessionId, url, token: tokens.reviewer, browserToken: tokens.browser,
      expiresAt: recovery.expiresAt, assessment, submission: snapshot.submission, feedback: snapshot.feedback,
      failed: snapshot.status === reviewStates.failed });
  });
  const review = createWrittenReview(() => state.snapshot().quiz,
    recovery.data ?? { sessionId: recovery.sessionId, submission: null, feedback: null },
    value => recovery.save({ version: 1, failed: false, ...value, url, token: tokens.reviewer, browserToken: tokens.browser,
      expiresAt: recovery.expiresAt, assessment: state.snapshot() }));
  function bind(address: string) {
    url = address;
    const snapshot = review.snapshot();
    recovery.save({ version: 1, sessionId: review.sessionId, url, token: tokens.reviewer,
      browserToken: tokens.browser, expiresAt: recovery.expiresAt, assessment: state.snapshot(),
      submission: snapshot.submission, feedback: snapshot.feedback, failed: snapshot.status === reviewStates.failed });
  }
  return { state, review, tokens, bind, expiresAt: recovery.expiresAt, path: recovery.path,
    port: recovery.data ? Number(new URL(recovery.data.url).port) : undefined,
    release: recovery.release, remove: recovery.remove };
}
