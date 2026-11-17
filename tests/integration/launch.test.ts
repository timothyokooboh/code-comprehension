import { expect, test } from 'vitest';
import { launchCli, runCli } from '../support/cli.js';

test('the CLI serves its built UI and local runtime status', async () => {
  const app = await launchCli();
  try {
    const page = await fetch(app.url);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    const html = await page.text();
    const script = html.match(/src="([^"]+\.js)"/)?.[1];
    expect(script).toBeDefined();
    const asset = await fetch(new URL(script!, app.url));
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('javascript');
    const status = await fetch(`${app.url}/api/status`);
    expect(await status.json()).toEqual({ name: 'Code Comprehension', status: 'ready' });
  } finally {
    await app.stop();
  }
});

test('CLI help and port validation provide readable catalog messages', () => {
  const help = runCli(['--help']);
  expect(help.status).toBe(0);
  expect(help.stdout).toContain('Open the local code comprehension application');
  expect(help.stdout).toContain('print the URL without opening a browser');

  const invalidPort = runCli(['--port', '70000', '--no-open']);
  expect(invalidPort.status).toBe(1);
  expect(invalidPort.stderr).toContain('Port must be an integer between 0 and 65535.');
});

test('unknown CLI options use catalog-backed recovery guidance', () => {
  const result = runCli(['--unknown']);
  expect(result.status).toBe(1);
  expect(result.stderr.trim()).toBe('Invalid command arguments. Run with --help to see available options.');
});
