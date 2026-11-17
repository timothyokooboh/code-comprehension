import { applicationName } from '@code-comprehension/quiz-contract';
import { cliErrorCodes, type CliErrorCode } from '../errors.js';

export const messages = {
  description: 'Open the local code comprehension application',
  help: 'display help for command',
  usage: (command: string) => `Usage: ${command} [options]`,
  optionsHeading: 'Options:',
  invalidArguments: 'Invalid command arguments. Run with --help to see available options.',
  missingPort: 'Provide a port number after --port, or omit the option to choose a free port.',
  portOption: 'local port (0 chooses an available port)',
  noOpenOption: 'print the URL without opening a browser',
  invalidPort: (maximum: number) => `Port must be an integer between 0 and ${maximum}.`,
  started: (url: string) => `${applicationName} is running at ${url}`,
  stopHint: 'Press Ctrl+C to stop.',
  browserUnavailable: (url: string) => `Could not open a browser. Visit ${url} manually.`,
  notFound: 'Not found',
  errors: {
    [cliErrorCodes.uiMissing]: 'Built UI is missing or unreadable. Rebuild or reinstall the application.',
    [cliErrorCodes.addressUnavailable]: 'No local server address is available. Restart the application.',
    [cliErrorCodes.startupFailed]: 'Unable to start the local application. Check the selected port and try again.',
    [cliErrorCodes.shutdownFailed]: 'Unable to stop the local application cleanly.',
  } satisfies Record<CliErrorCode, string>,
} as const;
