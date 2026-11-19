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

test('submission distinguishes incorrect selections and missed correct answers', async ({ page }) => {
  const app = await launchCli(['--quiz', quizFile]);
  try {
    await page.goto(app.url);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox', { name: 'Reuse the idempotency key' }).check();
    await page.getByRole('checkbox', { name: 'Create a duplicate payment' }).check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    const incorrect = page.locator('label').filter({ hasText: 'Create a duplicate payment' });
    const missed = page.locator('label').filter({ hasText: 'Record the provider response' });
    const correct = page.locator('label').filter({ hasText: 'Reuse the idempotency key' });
    await expect(incorrect).toContainText('Incorrect — your selection');
    await expect(missed).toContainText('Correct — not selected');
    await expect(correct).toContainText('Correct — your selection');
    const background = (element: HTMLElement | SVGElement) => getComputedStyle(element).backgroundColor;
    expect(await incorrect.evaluate(background)).not.toBe(await correct.evaluate(background));
    await expect(incorrect.getByRole('checkbox')).toBeChecked();
    await expect(missed.getByRole('checkbox')).not.toBeChecked();
    await page.getByRole('button', { name: 'Retake quiz' }).click();
    await expect(page.getByText('Incorrect — your selection')).toHaveCount(0);
    await expect(page.getByText('Correct — not selected')).toHaveCount(0);
    expect(await incorrect.evaluate(background)).toBe(await correct.evaluate(background));
  } finally {
    await app.stop();
  }
});
