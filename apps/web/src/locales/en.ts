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
  assessment: {
    label: 'Quiz session',
    emptyTitle: 'No assessment loaded',
    emptyDescription: 'Your quiz will appear here when an assessment is available.',
  },
} as const;
