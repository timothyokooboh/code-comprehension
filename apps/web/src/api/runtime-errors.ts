export const runtimeErrorCodes = {
  unavailable: 'runtime_unavailable',
  invalidResponse: 'runtime_invalid_response',
  notReady: 'runtime_not_ready',
} as const;

export type RuntimeErrorCode = typeof runtimeErrorCodes[keyof typeof runtimeErrorCodes];

export class RuntimeConnectionError extends Error {
  readonly code: RuntimeErrorCode;

  constructor(code: RuntimeErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = 'RuntimeConnectionError';
    this.code = code;
  }
}
