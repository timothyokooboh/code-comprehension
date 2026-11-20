import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { launchCli } from '../support/cli.js';

const quizFile = fileURLToPath(new URL('../fixtures/quiz.json', import.meta.url));

for (const mode of ['animated', 'reduced-motion', 'without-view-transitions'] as const) {
  test(`diagram expands and closes accessibly (${mode})`, async ({ page }) => {
    if (mode === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    if (mode === 'without-view-transitions') {
      await page.addInitScript(() => Object.defineProperty(document, 'startViewTransition', { value: undefined }));
    }
    if (mode === 'animated') {
      await page.addInitScript(() => {
        const state = Object.assign(window, { diagramTransitions: [] as string[], diagramTransitionFinishes: [] as Promise<void>[] });
        const start = document.startViewTransition.bind(document);
        document.startViewTransition = (update) => {
          const transition = start(update);
          state.diagramTransitionFinishes.push(transition.finished);
          void transition.ready.then(() => state.diagramTransitions.push('ready'), () => state.diagramTransitions.push('skipped'));
          return transition;
        };
      });
    }
    const app = await launchCli(['--quiz', quizFile]);
    try {
      await page.route('**/api/quiz', async (route) => {
        const response = await route.fetch();
        const quiz = await response.json();
        quiz.questions[0].diagram = { format: 'mermaid', source: 'flowchart LR\nA[Question data] --> B[Validation] --> C[Browser]' };
        await route.fulfill({ json: quiz });
      });
      await page.goto(app.url);
      await page.getByRole('radio').first().check();
      await page.getByRole('checkbox').first().check();
      await page.getByRole('button', { name: 'Submit answers' }).click();
      const expand = page.getByRole('button', { name: 'Expand diagram', exact: true });
      await expect(expand).toBeVisible();
      const inline = page.getByRole('img', { name: 'Supporting diagram', exact: true });
      const originalWidth = (await inline.boundingBox())!.width;
      await expand.click();
      const dialog = page.getByRole('dialog', { name: 'Supporting diagram', exact: true });
      await expect(dialog).toBeVisible();
      const enlarged = dialog.getByRole('img');
      await expect(enlarged).toBeVisible();
      expect((await enlarged.boundingBox())!.width).toBeGreaterThan(originalWidth);
      const close = dialog.getByRole('button', { name: 'Close diagram', exact: true });
      await expect(close).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(expand).not.toBeFocused();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await close.click();
      await expect(dialog).not.toBeVisible();
      await expect(expand).toBeFocused();
      if (mode === 'animated') {
        await page.evaluate(() => Promise.all(Reflect.get(window, 'diagramTransitionFinishes') as Promise<void>[]));
      }
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(expand).toBeFocused();
      await expect(page.getByRole('heading', { name: /Score:/ })).toBeVisible();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
      if (mode === 'animated') {
        const transitions = await page.evaluate(() => Reflect.get(window, 'diagramTransitions') as string[]);
        expect(transitions.filter((state) => state === 'ready').length).toBeGreaterThanOrEqual(2);
        expect(transitions).not.toContain('skipped');
      }
    } finally { await app.stop(); }
  });
}
