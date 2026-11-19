import { quizPath, quizSchema } from '@code-comprehension/quiz-contract';
import { QuizLoadError, quizLoadErrorCodes } from './quiz-errors';

const quizRequestTimeoutMs = 5_000;

export async function requestQuiz(signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(quizPath, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(quizRequestTimeoutMs)]),
    });
  } catch (cause) {
    throw new QuizLoadError(quizLoadErrorCodes.unavailable, { cause });
  }
  if (!response.ok) throw new QuizLoadError(quizLoadErrorCodes.unavailable);
  let data: unknown;
  try {
    data = await response.json();
  } catch (cause) {
    throw new QuizLoadError(quizLoadErrorCodes.invalidResponse, { cause });
  }
  const result = quizSchema.nullable().safeParse(data);
  if (!result.success) throw new QuizLoadError(quizLoadErrorCodes.invalidResponse);
  return result.data;
}
