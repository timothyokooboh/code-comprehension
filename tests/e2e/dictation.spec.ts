import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { launchCli } from '../support/cli.js';

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

type FakeRecognition = {
  onstart?: () => void; onend?: () => void;
  onerror?: (event: { error: string }) => void;
  onresult?: (event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void;
};
type SpeechHarness = Window & { speechTest: { current?: FakeRecognition; tracks: MediaStreamTrack[] } };
async function installSpeech(page: Page) {
  await page.addInitScript(() => {
    const browser = window as unknown as SpeechHarness;
    browser.speechTest = { tracks: [] };
    const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await getMedia(constraints);
      browser.speechTest.tracks.push(...stream.getTracks());
      return stream;
    };
    class FakeSpeech {
      onstart?: () => void; onend?: () => void;
      start() { browser.speechTest.current = this; queueMicrotask(() => this.onstart?.()); }
      stop() { queueMicrotask(() => this.onend?.()); }
      abort() { queueMicrotask(() => this.onend?.()); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeSpeech });
  });
}
async function speak(page: Page, words: string[]) {
  await page.evaluate(words => {
    (window as unknown as SpeechHarness).speechTest.current?.onresult?.({ results: words.map(transcript => ({ isFinal: true, 0: { transcript } })) });
  }, words);
}
async function expectMicrophoneReleased(page: Page) {
  expect(await page.evaluate(() => (window as unknown as SpeechHarness).speechTest.tracks.every(track => track.readyState === 'ended'))).toBe(true);
}

test('dictation appends once, supports editing and repeat recordings, and releases the microphone', async ({ page }) => {
  await installSpeech(page);
  const app = await launchCli(['--quiz', resolve('tests/fixtures/mixed-quiz.json')]);
  try {
    await page.goto(app.url);
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    await answer.fill('Existing reasoning.');
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Dictate your answer' }).click();
    const stop = page.getByRole('button', { name: 'Stop and add transcript' });
    await expect(stop).toBeEnabled();
    await expect(page.locator('.wave-bar')).toHaveCount(48);
    await page.locator('.recording-surface').screenshot({ path: test.info().outputPath('recording.png') });
    await expect(answer).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Submit answers' })).toBeDisabled();
    await speak(page, ['The request can time out.', 'The charge may succeed.']);
    await speak(page, ['The request can time out.', 'The charge may succeed.']);
    await stop.click();
    await expect(answer).toHaveValue('Existing reasoning. The request can time out. The charge may succeed.');
    await expect(answer).toBeFocused();
    await expectMicrophoneReleased(page);
    await page.reload();
    await expect(answer).toHaveValue('Existing reasoning. The request can time out. The charge may succeed.');
    await answer.fill('Edited.');
    await page.getByRole('button', { name: 'Dictate your answer' }).click();
    await expect(stop).toBeEnabled();
    await speak(page, ['Reuse the key.']);
    await stop.click();
    await expect(answer).toHaveValue('Edited. Reuse the key.');
    await expectMicrophoneReleased(page);
  } finally { await app.stop(); }
});

test('cancel discards speech and errors preserve existing text', async ({ page }) => {
  await installSpeech(page);
  const app = await launchCli(['--quiz', resolve('tests/fixtures/mixed-quiz.json')]);
  try {
    await page.goto(app.url);
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    await answer.fill('Keep this.');
    await page.getByRole('button', { name: 'Dictate your answer' }).click();
    await expect(page.getByRole('button', { name: 'Stop and add transcript' })).toBeEnabled();
    await speak(page, ['Discard this.']);
    await page.getByRole('button', { name: 'Cancel recording' }).click();
    await expect(answer).toHaveValue('Keep this.');
    await expectMicrophoneReleased(page);
    await page.getByRole('button', { name: 'Dictate your answer' }).click();
    await expect(page.getByRole('button', { name: 'Stop and add transcript' })).toBeEnabled();
    await page.evaluate(() => (window as unknown as SpeechHarness).speechTest.current?.onerror?.({ error: 'network' }));
    await expect(answer).toHaveValue('Keep this.');
    await expect(page.getByRole('alert')).toContainText('could not connect');
    await expectMicrophoneReleased(page);
  } finally { await app.stop(); }
});

test('permission denial leaves typing available with recovery guidance', async ({ page }) => {
  await installSpeech(page);
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  const app = await launchCli(['--quiz', resolve('tests/fixtures/mixed-quiz.json')]);
  try {
    await page.goto(app.url);
    await page.getByRole('button', { name: 'Dictate your answer' }).click();
    await expect(page.getByRole('alert')).toContainText('access was denied');
    await expect(page.getByRole('textbox', { name: 'Your explanation' })).toBeEditable();
  } finally { await app.stop(); }
});

test('unsupported browsers retain the text editor and explain the unavailable mic', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined });
  });
  const app = await launchCli(['--quiz', resolve('tests/fixtures/mixed-quiz.json')]);
  try {
    await page.goto(app.url);
    await expect(page.getByRole('button', { name: 'Dictate your answer' })).toBeDisabled();
    await expect(page.getByText('Dictation is unavailable in this browser. You can still type your answer.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Your explanation' })).toBeEditable();
  } finally { await app.stop(); }
});

test('cancelling a pending permission request discards the late microphone stream', async ({ page }) => {
  await installSpeech(page);
  await page.addInitScript(() => {
    const browser = window as unknown as { releaseMicrophone?: () => void };
    const acquire = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = constraints => new Promise((resolve, reject) => {
      browser.releaseMicrophone = () => { void acquire(constraints).then(resolve, reject); };
    });
  });
  const app = await launchCli(['--quiz', resolve('tests/fixtures/mixed-quiz.json')]);
  try {
    await page.goto(app.url);
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    await answer.fill('Preserved draft.');
    await page.getByRole('button', { name: 'Dictate your answer' }).click();
    await expect(page.getByRole('status').getByText('Allow microphone access to begin…')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel recording' }).click();
    await page.evaluate(() => (window as unknown as { releaseMicrophone: () => void }).releaseMicrophone());
    await expect.poll(() => page.evaluate(() => (window as unknown as SpeechHarness).speechTest.tracks.length)).toBeGreaterThan(0);
    await expectMicrophoneReleased(page);
    await expect(answer).toHaveValue('Preserved draft.');
    expect(await page.evaluate(() => Boolean((window as unknown as SpeechHarness).speechTest.current))).toBe(false);
  } finally { await app.stop(); }
});
