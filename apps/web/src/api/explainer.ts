import {
  explainerPath,
  explainerSchema,
} from '@code-comprehension/quiz-contract';
export const explainerErrors = {
  unavailable: 'explainer_unavailable',
  invalid: 'explainer_invalid',
} as const;
export class ExplainerRequestError extends Error {
  constructor(
    readonly code: (typeof explainerErrors)[keyof typeof explainerErrors],
    options?: ErrorOptions,
  ) {
    super(code, options);
  }
}
const requestTimeoutMs = 5_000;
export async function requestExplainer(signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(explainerPath, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
    });
  } catch (cause) {
    throw new ExplainerRequestError(explainerErrors.unavailable, { cause });
  }
  if (!response.ok)
    throw new ExplainerRequestError(explainerErrors.unavailable);
  try {
    return explainerSchema.parse(await response.json());
  } catch (cause) {
    throw new ExplainerRequestError(explainerErrors.invalid, { cause });
  }
}
