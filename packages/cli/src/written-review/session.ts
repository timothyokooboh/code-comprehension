import { CliError, cliErrorCodes } from '../errors.js';
import { randomUUID } from 'node:crypto';
import { reviewStates, questionTypes, type Quiz, type AssessmentSource } from '@code-comprehension/quiz-contract';
import { createAssessmentState } from '../assessment/state.js';
import { loadRevision } from '../assessment/source.js';
import { openRecovery, type RecoveryData } from './recovery.js';
import { createWrittenReview, type SavedReview } from './state.js';

/** Owns the atomic boundary between assessment identity, accepted work, and recovery. */
export function createReviewSession(quiz: Quiz | null, source: AssessmentSource, resumeFile?: string) {
  const recovery = openRecovery(resumeFile);
  const tokens = recovery.tokens;
  let url = recovery.data?.url ?? '';
  const state = createAssessmentState(quiz, source, loadRevision, {
    restored: recovery.data?.assessment,
    validateDisplay(display) {
      if (state.snapshot().quiz?.questions.some(question => question.type === questionTypes.written) && display.attemptId !== review.snapshot().attemptId) {
        throw new CliError(cliErrorCodes.assessmentStale);
      }
    },
    persist(assessment) {
      if (assessment.revision !== state.snapshot().revision) {
        const next = { sessionId: review.sessionId, attemptId: randomUUID(), questionIds: [], submission: null, feedback: null, failed: false };
        persist(assessment, next);
        review.reset(next);
      } else persist(assessment);
    },
  });
  const review = createWrittenReview(() => state.snapshot().quiz,
    recovery.data ?? { sessionId: recovery.sessionId, submission: null, feedback: null },
    value => persist(state.snapshot(), value));
  function persist(assessment: RecoveryData['assessment'] = state.snapshot(), value?: SavedReview) {
    const snapshot = review.snapshot();
    const retaking = value?.attemptId !== undefined && value.attemptId !== snapshot.attemptId && assessment.revision === state.snapshot().revision;
    if (retaking) assessment = { ...assessment, displayToken: randomUUID(),
      displayed: (value.questionIds ?? []).map((id, index) => ({ id, number: index + 1 })) };
    recovery.save({ version: 1, sessionId: review.sessionId, url, token: tokens.reviewer,
      browserToken: tokens.browser, expiresAt: recovery.expiresAt, assessment,
      attemptId: snapshot.attemptId, questionIds: snapshot.questionIds, submission: snapshot.submission, feedback: snapshot.feedback, failed: snapshot.status === reviewStates.failed,
      ...value });
    if (retaking) state.adoptDisplay(assessment);
  }
  function bind(address: string) { url = address; persist(); }
  return { state, review, tokens, bind, expiresAt: recovery.expiresAt, path: recovery.path,
    port: recovery.data ? Number(new URL(recovery.data.url).port) : undefined,
    release: recovery.release, remove: recovery.remove };
}
