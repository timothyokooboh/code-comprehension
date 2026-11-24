import { assessmentPaths } from '@code-comprehension/quiz-contract';
import { QuizLoadError, quizLoadErrorCodes } from './quiz-errors';

const displayRequestTimeoutMs = 5_000;

export async function publishAssessmentDisplay(revision: string, questionIds: string[], signal: AbortSignal, attemptId?: string) {
  const response = await fetch(assessmentPaths.view, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision, questionIds, attemptId }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(displayRequestTimeoutMs)]),
  });
  if (!response.ok) throw new QuizLoadError(quizLoadErrorCodes.unavailable);
}
