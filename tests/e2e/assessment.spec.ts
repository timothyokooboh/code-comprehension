import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { launchCli } from '../support/cli.js';

const quizFile = fileURLToPath(new URL('../fixtures/quiz.json', import.meta.url));

test('answer both question types, review score, and retake to a perfect score', async ({ page }) => {
  const app = await launchCli(['--quiz', quizFile]);
  try {
    await page.goto(app.url);
    await expect(page.getByRole('heading', { name: 'Payment retries' })).toBeVisible();
    await expect(page.getByText('Choose one answer.', { exact: true })).toBeVisible();
    await expect(page.getByText('Choose all correct answers.', { exact: true })).toBeVisible();
    const radio = page.getByRole('radio', { name: 'Retry with the same payment key' });
    await radio.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Create a new payment key' })).toBeChecked();
    await page.keyboard.press('ArrowUp');
    const key = page.getByRole('checkbox', { name: 'Reuse the idempotency key' });
    await key.focus();
    await page.keyboard.press('Space');
    await page.getByRole('checkbox', { name: 'Record the provider response' }).check();
    await page.getByRole('checkbox', { name: 'Create a duplicate payment' }).check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('heading', { name: 'Score: 1 of 2 (50%)' })).toBeVisible();
    await expect(page.getByText('Correct answers: Reuse the idempotency key; Record the provider response')).toBeVisible();
    await expect(radio).toBeDisabled();

    await page.getByRole('button', { name: 'Retake quiz' }).click();
    await expect(page.getByRole('heading', { name: /Score:/ })).toHaveCount(0);
    await expect(radio).not.toBeChecked();
    await expect(key).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Create a duplicate payment' })).not.toBeChecked();
    await radio.check();
    await key.check();
    await page.getByRole('checkbox', { name: 'Record the provider response' }).check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('heading', { name: 'Score: 2 of 2 (100%)' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: /Score:/ })).toHaveCount(0);
    await expect(radio).not.toBeChecked();
  } finally {
    await app.stop();
  }
});
