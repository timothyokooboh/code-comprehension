import { basename } from 'node:path';
import { assessmentTypes } from '@code-comprehension/quiz-contract';
import { loadQuiz } from '../load-quiz.js';
import { CliError, cliErrorCodes } from '../errors.js';
import { readCurrentPrEvidence } from './evidence.js';

export async function loadPrAssessment(directory: string, replacementPath?: string) {
  const session = await readCurrentPrEvidence(directory);
  const { manifest } = session;
  const quiz = await loadQuiz(replacementPath ?? session.quizPath);
  if (quiz.type !== assessmentTypes.pr) throw new CliError(cliErrorCodes.prQuizRequired);
  return { ...quiz, id: basename(session.directory), comparison: manifest.comparison };
}
