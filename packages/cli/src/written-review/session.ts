import { reviewStates, type Quiz, type AssessmentSource } from '@code-comprehension/quiz-contract';
import { createAssessmentState } from '../assessment/state.js';
import { loadRevision } from '../assessment/source.js';
import { CliError, cliErrorCodes } from '../errors.js';
import { openRecovery, type RecoveryData } from './recovery.js';
import { createWrittenReview, type SavedReview } from './state.js';

/** Owns the atomic boundary between assessment identity, accepted work, and recovery. */
export function createReviewSession(quiz: Quiz | null, source: AssessmentSource, resumeFile?: string) {
  const recovery = openRecovery(resumeFile);
  const tokens = recovery.tokens;
  let url = recovery.data?.url ?? '';
  const state = createAssessmentState(quiz, source, loadRevision, recovery.data?.assessment, assessment => {
    const snapshot = review.snapshot();
    if (snapshot.submission && assessment.revision !== state.snapshot().revision) throw new CliError(cliErrorCodes.assessmentStale);
    persist(assessment);
  });
  const review = createWrittenReview(() => state.snapshot().quiz,
    recovery.data ?? { sessionId: recovery.sessionId, submission: null, feedback: null },
    value => persist(state.snapshot(), value));
  function persist(assessment: RecoveryData['assessment'] = state.snapshot(), value?: SavedReview) {
    const snapshot = review.snapshot();
    recovery.save({ version: 1, sessionId: review.sessionId, url, token: tokens.reviewer,
      browserToken: tokens.browser, expiresAt: recovery.expiresAt, assessment,
      submission: snapshot.submission, feedback: snapshot.feedback, failed: snapshot.status === reviewStates.failed,
      ...value });
  }
  function bind(address: string) { url = address; persist(); }
  return { state, review, tokens, bind, expiresAt: recovery.expiresAt, path: recovery.path,
    port: recovery.data ? Number(new URL(recovery.data.url).port) : undefined,
    release: recovery.release, remove: recovery.remove };
}
