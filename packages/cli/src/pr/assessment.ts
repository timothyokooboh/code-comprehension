import { basename } from 'node:path';
import { assessmentTypes } from '@code-comprehension/quiz-contract';
import { loadQuiz } from '../load-quiz.js';
import { CliError, cliErrorCodes } from '../errors.js';
import { readSession } from './session.js';
import { captureComparison } from './comparison.js';

export async function loadPrAssessment(directory: string) {
  const session = await readSession(directory);
  const { manifest } = session;
  const snapshot = await captureComparison(manifest.repo, manifest.comparison.target, manifest.baselineOverride);
  if (snapshot.fingerprint !== manifest.fingerprint) throw new CliError(cliErrorCodes.prChanged);
  const quiz = await loadQuiz(session.quizPath);
  if (quiz.type !== assessmentTypes.pr) throw new CliError(cliErrorCodes.prQuizRequired);
  return { ...quiz, id: basename(session.directory), comparison: manifest.comparison };
}
