import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { launchCli } from '../support/cli.js';

const quizFile = fileURLToPath(new URL('../fixtures/quiz.json', import.meta.url));

test('review concise or detailed evidence after submission and after retaking', async ({ page }) => {
  const app = await launchCli(['--quiz', quizFile]);
  try {
    await page.goto(app.url);
    await expect(page.getByText('The key prevents duplicate payments.')).toHaveCount(0);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    const first = page.getByRole('region', { name: 'Explanation for question 1', exact: true });
    const second = page.getByRole('region', { name: 'Explanation for question 2', exact: true });
    await expect(first).toContainText('The key prevents duplicate payments.');
    await expect(first).toContainText('src/payments.ts:12');
    await expect(second).toContainText('src/payments.ts:20');
    const detail = first.getByRole('button', { name: 'Show detailed explanation' });
    await detail.focus();
    await page.keyboard.press('Enter');
    await expect(first).toContainText('Retrying the same request reuses the idempotency key.');
    await expect(first.getByText('The key prevents duplicate payments.', { exact: true })).toHaveCount(0);
    await expect(second).toContainText('Keep identity and results consistent.');
    await first.getByRole('button', { name: 'Show concise explanation' }).click();
    await expect(first).toContainText('The key prevents duplicate payments.');
    await page.getByRole('button', { name: 'Retake quiz' }).click();
    await expect(first).toHaveCount(0);
    await page.getByRole('radio').last().check();
    await page.getByRole('checkbox').last().check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(first).toContainText('The key prevents duplicate payments.');
    await expect(second).toContainText('Keep identity and results consistent.');
  } finally {
    await app.stop();
  }
});

test('optional diagrams render with readable source and invalid diagrams preserve feedback', async ({ page }) => {
  const app = await launchCli(['--quiz', quizFile]);
  try {
    await page.route('**/api/quiz', async (route) => {
      const response = await route.fetch();
      const quiz = await response.json();
      quiz.questions[0].diagram = { format: 'mermaid', source: '---\nconfig:\n  htmlLabels: true\n  flowchart:\n    htmlLabels: true\n---\nflowchart LR\nA[Request] --> B[Retry]' };
      await route.fulfill({ json: quiz });
    });
    await page.goto(app.url);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    const first = page.getByRole('region', { name: 'Explanation for question 1', exact: true });
    const image = first.getByRole('img', { name: 'Supporting diagram' });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const svg = await image.evaluate(async (element) => {
      const response = await fetch((element as HTMLImageElement).src);
      return response.text();
    });
    expect(svg).not.toContain('<foreignObject');
    expect(svg).toContain('Request');
    await expect(page.getByRole('region', { name: 'Explanation for question 2', exact: true }).getByRole('img')).toHaveCount(0);
    await first.getByText('Diagram source', { exact: true }).click();
    await expect(first.getByText('flowchart LR', { exact: false })).toBeVisible();

    await page.unroute('**/api/quiz');
    await page.route('**/api/quiz', async (route) => {
      const response = await route.fetch();
      const quiz = await response.json();
      quiz.questions[0].diagram = { format: 'mermaid', source: 'not a valid diagram' };
      await route.fulfill({ json: quiz });
    });
    await page.reload();
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(first.getByRole('status')).toHaveText('Unable to render this diagram. You can inspect its source below.');
    await expect(first).toContainText('The key prevents duplicate payments.');
    await first.getByText('Diagram source', { exact: true }).click();
    await expect(first.getByText('not a valid diagram', { exact: true })).toBeVisible();
  } finally {
    await app.stop();
  }
});
