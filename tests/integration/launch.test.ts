import { expect, test } from 'vitest';
import { launchCli } from '../support/cli.js';

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
