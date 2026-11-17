#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import open from 'open';
import { startServer } from './server.js';

function parsePort(value: string) {
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new InvalidArgumentError('Port must be an integer between 0 and 65535.');
  }
  return port;
}

async function launch(options: { port: number; open: boolean }) {
  const app = await startServer(options.port);
  console.log(`Code Comprehension is running at ${app.url}`);
  console.log('Press Ctrl+C to stop.');

  const stop = () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    void app.close().catch((error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  if (options.open) {
    try {
      await open(app.url);
    } catch {
      console.warn(`Could not open a browser. Visit ${app.url} manually.`);
    }
  }
}

await new Command()
  .name('code-comprehension')
  .description('Open the local code comprehension application')
  .option('--port <number>', 'local port (0 chooses an available port)', parsePort, 0)
  .option('--no-open', 'print the URL without opening a browser')
  .action(launch)
  .parseAsync()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
