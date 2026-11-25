import { test, expect } from '@playwright/test';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { launchCli } from '../support/cli.js';

// Edit an isolated copy, never the developer's working source files.
async function copyUi() {
  const artifacts = resolve('artifacts');
  await mkdir(artifacts, { recursive: true });
  const directory = await mkdtemp(join(artifacts, 'development-ui-'));
  await cp(resolve('apps/web'), directory, {
    recursive: true, filter: path => !['node_modules', 'dist'].includes(basename(path)),
  });
  await symlink(resolve('apps/web/node_modules'), join(directory, 'node_modules'), 'dir');
  const tsconfig = JSON.parse(await readFile(join(directory, 'tsconfig.json'), 'utf8'));
  tsconfig.extends = resolve('tsconfig.json');
  await writeFile(join(directory, 'tsconfig.json'), JSON.stringify(tsconfig));
  return directory;
}

test('live UI edits and reloads preserve mixed answers and the active review attempt', async ({ page }) => {
  test.setTimeout(60_000);
  const directory = await copyUi();
  let app = await launchCli(['--quiz', resolve('tests/fixtures/mixed-quiz.json'), '--dev-ui', directory]);
  try {
    await page.goto(app.url);
    const radio = page.getByRole('radio').first();
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    await radio.check();
    await page.getByRole('checkbox').nth(0).check();
    await page.getByRole('checkbox').nth(1).check();
    await answer.fill('The payment could succeed before the response is lost.');
    const sessionBefore = await (await page.request.get(`${app.url}/api/review/session`)).json();
    await page.evaluate(() => { (window as unknown as { liveMarker: boolean }).liveMarker = true; });

    const component = join(directory, 'src/components/WrittenQuestion.vue');
    const source = await readFile(component, 'utf8');
    await writeFile(component, source.replace('class="answer-editor"', 'class="answer-editor" data-live-update="ready"')
      .replace('border-radius: .875rem', 'border-radius: 1.125rem'));
    await expect(page.locator('[data-live-update="ready"]')).toBeVisible();
    await expect(answer).toHaveCSS('border-radius', '18px');
    expect(await page.evaluate(() => (window as unknown as { liveMarker: boolean }).liveMarker)).toBe(true);
    await expect(radio).toBeChecked();
    await expect(answer).toHaveValue('The payment could succeed before the response is lost.');

    // A catalog edit can invalidate the whole page rather than just one SFC.
    const catalog = join(directory, 'src/locales/en.ts');
    await writeFile(catalog, (await readFile(catalog, 'utf8')).replace('Explain what happens and why…', 'Explain your reasoning…'));
    await expect(answer).toHaveAttribute('placeholder', 'Explain your reasoning…');
    await expect(radio).toBeChecked();
    await expect(answer).toHaveValue('The payment could succeed before the response is lost.');

    await page.reload();
    await expect(radio).toBeChecked();
    await expect(answer).toHaveValue('The payment could succeed before the response is lost.');
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText('MCQ score: 2 of 2 (100%)')).toBeVisible();
    await expect(page.getByRole('status').getByText('Reviewer disconnected')).toBeVisible();
    const sessionAfter = await (await page.request.get(`${app.url}/api/review/session`)).json();
    expect(sessionAfter.sessionId).toBe(sessionBefore.sessionId);
    expect(sessionAfter.attemptId).toBe(sessionBefore.attemptId);
    expect(sessionAfter.revision).toBe(sessionBefore.revision);

    const sessionFile = app.reviewSession!;
    const url = app.url;
    await app.stop('SIGKILL');
    app = await launchCli(['--resume-review', sessionFile, '--dev-ui', directory]);
    expect(app.url).toBe(url);
    await page.reload();
    await expect(answer).toHaveValue('The payment could succeed before the response is lost.');
    await expect(answer).toHaveAttribute('readonly');
    await expect(page.getByText('MCQ score: 2 of 2 (100%)')).toBeVisible();
  } finally {
    await app.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
