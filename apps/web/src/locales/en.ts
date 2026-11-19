import { quizLoadErrorCodes, type QuizLoadErrorCode } from '../api/quiz-errors.ts';
import { questionTypes } from '@code-comprehension/quiz-contract';
import { runtimeErrorCodes, type RuntimeErrorCode } from '../api/runtime-errors.ts';
import { applicationName } from '@code-comprehension/quiz-contract';

export const messages = {
  app: {
    title: applicationName,
    tagline: 'Understand what you ship',
    introduction: 'A space to understand your changes and the systems you build.',
  },
  connection: {
    connecting: 'Connecting locally…',
    connected: 'Connected locally',
    errors: {
      [runtimeErrorCodes.unavailable]: 'Unable to connect. Restart the CLI and reload this page.',
      [runtimeErrorCodes.invalidResponse]: 'The local server returned an invalid response. Restart the CLI and reload this page.',
      [runtimeErrorCodes.notReady]: 'The local server is not ready. Restart the CLI and reload this page.',
    } satisfies Record<RuntimeErrorCode, string>,
  },
  quiz: {
    loading: 'Loading assessment…',
    scope: (scopes: readonly string[]) => `Scope: ${scopes.join(', ')}`,
    question: (number: number, prompt: string) => `${number}. ${prompt}`,
    instructions: {
      [questionTypes.single]: 'Choose one answer.',
      [questionTypes.multiple]: 'Choose all correct answers.',
    },
    correctAnswers: (answers: readonly string[]) => `Correct answers: ${answers.join('; ')}`,
    correctSelected: 'Correct — your selection',
    correctMissed: 'Correct — not selected',
    incorrectSelected: 'Incorrect — your selection',
    submit: 'Submit answers',
    submitHint: 'Select an answer for every question before submitting.',
    retake: 'Retake quiz',
    resultLabel: 'Assessment result',
    score: (correct: number, total: number, percentage: number) => `Score: ${correct} of ${total} (${percentage}%)`,
    perfect: 'Every answer is correct.',
    reviewHint: 'Review the correct answers, then try again.',
    errors: {
      [quizLoadErrorCodes.unavailable]: 'Unable to load the assessment. Restart the CLI and reload this page.',
      [quizLoadErrorCodes.invalidResponse]: 'The assessment data is invalid. Ask your agent to validate it and restart the quiz.',
    } satisfies Record<QuizLoadErrorCode, string>,
  },
  assessment: {
    label: 'Quiz session',
    emptyTitle: 'No assessment loaded',
    emptyDescription: 'Your quiz will appear here when an assessment is available.',
  },
} as const;
