export const cliErrorCodes = {
  sessionWriteFailed: 'session_write_failed',
  sessionCleanupFailed: 'session_cleanup_failed',
  prChanged: 'pr_changed',
  prQuizRequired: 'pr_quiz_required',
  gitFailed: 'git_failed',
  baselineRequired: 'baseline_required',
  sessionInvalid: 'session_invalid',
  prOptionsInvalid: 'pr_options_invalid',
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
