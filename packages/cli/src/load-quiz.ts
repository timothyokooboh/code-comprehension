import { readFile } from 'node:fs/promises';
import { quizSchema, type QuizValidationIssue } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from './errors.js';

export class QuizValidationError extends CliError {
  constructor(readonly issues: QuizValidationIssue[]) {
    super(cliErrorCodes.quizInvalid);
  }
}

async function readQuizData(path: string): Promise<unknown> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (cause) {
    throw new CliError(cliErrorCodes.quizUnreadable, { cause });
  }
  try {
    return JSON.parse(content);
  } catch (cause) {
    throw new CliError(cliErrorCodes.quizJsonInvalid, { cause });
  }
}

export async function loadQuiz(path: string) {
  const result = quizSchema.safeParse(await readQuizData(path));
  if (!result.success) throw new QuizValidationError(result.error.issues);
  return result.data;
}
