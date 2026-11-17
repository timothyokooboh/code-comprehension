import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../../packages/cli/dist/index.js', import.meta.url));

export async function launchCli() {
  const child = spawn(process.execPath, [entry, '--no-open'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  let output = '';
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });

  try {
    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`CLI startup timed out: ${output}`)), 5_000);
      child.once('error', reject);
      child.once('exit', () => {
        clearTimeout(timeout);
        reject(new Error(`CLI exited before starting: ${output}`));
      });
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
        if (address) {
          clearTimeout(timeout);
          resolve(address);
        }
      });
    });
    return {
      url,
      async stop() {
        child.kill('SIGTERM');
        await exited;
      },
    };
  } catch (error) {
    child.kill();
    await exited;
    throw error;
  }
}
