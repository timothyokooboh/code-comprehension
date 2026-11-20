import { diagramErrorCodes, type DiagramErrorCode } from '../diagrams/render-diagram.ts';
import { quizLoadErrorCodes, type QuizLoadErrorCode } from '../api/quiz-errors.ts';
import { questionTypes } from '@code-comprehension/quiz-contract';
import { runtimeErrorCodes, type RuntimeErrorCode } from '../api/runtime-errors.ts';
import { applicationName } from '@code-comprehension/quiz-contract';

export const messages = {
  app: {
    title: applicationName,
    tagline: 'Local quiz workspace',
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
    displayUnavailable: 'Question numbering could not be shared with your agent. Reload this page before asking about a numbered question.',
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
  prComparison: {
    label: 'PR comparison', target: 'Target', baseline: 'Baseline commit',
    uncommitted: 'Uncommitted changes',
    included: 'Included (staged, unstaged, and untracked files)',
    none: 'None at preparation',
  },
  workspace: {
    navigation: 'Question index',
    jumpTo: (number: number, prompt: string) => `Go to question ${number}: ${prompt}`,
    assessmentMode: 'Assessment',
    reviewMode: 'Results',
    progress: 'Your progress',
    answeredCount: (answered: number, total: number) => `${answered} / ${total}`,
    questionCount: (total: number) => total === 1 ? '1 question' : `${total} questions`,
    prompt: 'Questions',
    evidence: 'Answers / Evidence',
    answered: 'Answered',
    unanswered: 'Not answered',
    correct: 'Correct',
    review: 'Needs review',
  },
  diagram: {
    expand: 'Expand diagram',
    close: 'Close diagram',
    title: 'Supporting diagram',
    loading: 'Rendering diagram…',
    source: 'Diagram source',
    errors: {
      [diagramErrorCodes.renderFailed]: 'Unable to render this diagram. You can inspect its source below.',
    } satisfies Record<DiagramErrorCode, string>,
  },
  explanation: {
    label: (number: number) => `Explanation for question ${number}`,
    heading: 'Why this answer is correct',
    showConcise: 'Show concise explanation',
    showDetailed: 'Show detailed explanation',
    references: 'Supporting code',
    referenceHint: 'Locations are relative to the repository root. Open them in your editor to inspect the evidence.',
    location: (path: string, line?: number) => line === undefined ? path : `${path}:${line}`,
  },
  assessment: {
    label: 'Quiz session',
    emptyTitle: 'No assessment loaded',
    emptyDescription: 'Your quiz will appear here when an assessment is available.',
  },
} as const;
