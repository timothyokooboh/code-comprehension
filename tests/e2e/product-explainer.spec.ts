import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, expect } from '@playwright/test';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

test('architecture explainer opens independently of quiz setup with its canonical scope', async ({
  page,
}) => {
  const repo = createRepository();
  const temporary = mkdtempSync(join(tmpdir(), 'architecture-browser-'));
  let directory: string | undefined;
  try {
    const plan = join(temporary, 'plan.json');
    writeFileSync(
      plan,
      JSON.stringify({
        scopes: [
          {
            kind: 'general',
            focus: 'system_architecture_v1',
            name: 'Overview',
            description: 'System relationships',
            sourcePatterns: ['payment.ts'],
            supportingFiles: [],
          },
        ],
      }),
    );
    const prepared = JSON.parse(
      runCli(['--prepare-product-explainer', plan, '--repo', repo.path]).stdout,
    );
    directory = prepared.directory;
    const data = JSON.parse(
      readFileSync(
        new URL('../fixtures/explainer.json', import.meta.url),
        'utf8',
      ),
    );
    data.scope = prepared.scope;
    data.snapshot = prepared.snapshot;
    data.scenes.forEach((scene: { references: unknown[] }) => {
      scene.references = [{ path: 'payment.ts' }];
    });
    data.companion.references = [{ path: 'payment.ts' }];
    writeFileSync(prepared.explainerPath, JSON.stringify(data));
    const app = await launchCli(['--product-explainer', directory!]);
    try {
      await page.goto(`${app.url}/explainer`);
      await expect(
        page.getByText('General system architecture', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole('heading', { name: 'The essentials' }),
      ).toBeVisible();
      await expect(page.getByText('payment.ts').first()).toBeVisible();
      await expect(
        page.getByText('PR comparison', { exact: true }),
      ).toHaveCount(0);
    } finally {
      await app.stop();
    }
    expect(existsSync(join(repo.path, '.comprehension'))).toBe(false);
  } finally {
    if (directory && existsSync(directory))
      runCli(['--discard-product-explainer', directory]);
    rmSync(temporary, { recursive: true, force: true });
    repo.dispose();
  }
});
