import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

test('a small PR opens a grounded explainer with the actual baseline and uncommitted status', async ({
  page,
}) => {
  const repo = createRepository();
  let directory: string | undefined;
  try {
    repo.write('payment.ts', 'export const retries = 1;\n');
    const prepared = runCli([
      '--prepare-pr',
      '--repo',
      repo.path,
      '--target',
      'main',
      '--baseline',
      repo.baseline,
    ]);
    const session = JSON.parse(prepared.stdout);
    directory = session.directory;
    const data = JSON.parse(
      readFileSync(
        new URL('../fixtures/explainer.json', import.meta.url),
        'utf8',
      ),
    );
    data.type = 'pr';
    data.comparison = session.comparison;
    data.snapshot = session.snapshot;
    data.title = 'One payment retry';
    data.scenes = [
      {
        id: 'retry',
        title: 'Retry limit',
        nodes: [{ id: 'limit', label: 'One retry' }],
        edges: [],
        beats: [
          {
            text: 'The configured retry count changes from zero to one.',
            durationSeconds: 4,
            activeNodes: ['limit'],
          },
        ],
        references: [{ path: 'payment.ts', line: 1 }],
      },
    ];
    data.companion = {
      paragraphs: [
        'The exported retry count changes from zero to one. This fixture contains no caller or test that demonstrates payment behaviour.',
      ],
      references: [{ path: 'payment.ts', line: 1 }],
    };
    writeFileSync(session.explainerPath, JSON.stringify(data));
    const app = await launchCli(['--pr-explainer', directory!]);
    try {
      await page.goto(`${app.url}/explainer`);
      await expect(
        page.getByRole('heading', { name: data.title }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByText('Included (staged, unstaged, and untracked files)', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(repo.baseline, { exact: false }).first(),
      ).toBeVisible();
      await expect(page.getByText('payment.ts:1').first()).toBeVisible();
    } finally {
      await app.stop();
    }
    expect(existsSync(directory!)).toBe(false);
  } finally {
    if (directory && existsSync(directory)) runCli(['--discard-pr', directory]);
    repo.dispose();
  }
});
