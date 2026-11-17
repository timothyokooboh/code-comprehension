import open from 'open';
import { startServer } from './server.js';
import { messages } from './locales/en.js';
import { cliErrorCodes } from './errors.js';

type LocalApplication = Awaited<ReturnType<typeof startServer>>;

function registerShutdown(app: LocalApplication) {
  const stop = () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    void app.close().catch(() => {
      console.error(messages.errors[cliErrorCodes.shutdownFailed]);
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

async function openBrowser(url: string) {
  try {
    await open(url);
  } catch {
    console.warn(messages.browserUnavailable(url));
  }
}

export async function launch(options: { port: number; open: boolean }) {
  const app = await startServer(options.port);
  registerShutdown(app);
  console.log(messages.started(app.url));
  console.log(messages.stopHint);
  if (options.open) await openBrowser(app.url);
}
