export const quizLoadErrorCodes = {
  unavailable: 'quiz_unavailable',
  invalidResponse: 'quiz_invalid_response',
} as const;
export type QuizLoadErrorCode = typeof quizLoadErrorCodes[keyof typeof quizLoadErrorCodes];

export class QuizLoadError extends Error {
  readonly code: QuizLoadErrorCode;

  constructor(code: QuizLoadErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.code = code;
    this.name = 'QuizLoadError';
  }
}
