export const cliErrorCodes = {
  quizInvalid: 'quiz_invalid',
  quizUnreadable: 'quiz_unreadable',
  quizJsonInvalid: 'quiz_json_invalid',
  uiMissing: 'ui_missing',
  addressUnavailable: 'address_unavailable',
  startupFailed: 'startup_failed',
  shutdownFailed: 'shutdown_failed',
} as const;

export type CliErrorCode = typeof cliErrorCodes[keyof typeof cliErrorCodes];

export class CliError extends Error {
  constructor(readonly code: CliErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = 'CliError';
  }
}
