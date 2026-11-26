export const cliErrorCodes = {
  explainerInvalid: 'explainer_invalid', explainerUnreadable: 'explainer_unreadable',
  developmentUiUnavailable: 'development_ui_unavailable',
  questionFormatInvalid: 'question_format_invalid',
  questionFormatUnavailable: 'question_format_unavailable',
  questionCountInvalid: 'question_count_invalid',
  assessmentInvalid: 'assessment_invalid',
  assessmentStale: 'assessment_stale',
  assessmentUnavailable: 'assessment_unavailable',
  assessmentSourceInvalid: 'assessment_source_invalid',

  productScopesInvalid: 'product_scopes_invalid',
  productReviewInvalid: 'product_review_invalid',
  productReviewChanged: 'product_review_changed',
  productReviewRequired: 'product_review_required',
  productSourcesUnavailable: 'product_sources_unavailable',
  productGenerationRequired: 'product_generation_required',
  productSetupRequired: 'product_setup_required',
  productBankInvalid: 'product_bank_invalid',
  productStorageFailed: 'product_storage_failed',
  productConfigInvalid: 'product_config_invalid',
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
