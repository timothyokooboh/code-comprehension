import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium, expect } = createRequire(
  new URL('../../package.json', import.meta.url),
)('@playwright/test');
const url = 'http://127.0.0.1:5178/';

async function withBrowser(task) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });
    await task(page);
  } finally {
    await browser.close();
  }
}
function fakeSpeech() {
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const voice = {
    voiceURI: 'test-local',
    name: 'Test device voice',
    lang: 'en-US',
    localService: true,
  };
  const remote = {
    voiceURI: 'test-remote',
    name: 'Remote voice',
    lang: 'en-US',
    localService: false,
  };
  const synth = new EventTarget();
  synth.getVoices = () => [remote, voice];
  synth.calls = [];
  synth.cancelled = 0;
  synth.speak = (utterance) => {
    synth.calls.push(utterance);
    utterance.onstart?.();
  };
  synth.cancel = () => {
    synth.cancelled++;
  };
  Object.defineProperty(window, 'speechSynthesis', {
    value: synth,
    configurable: true,
  });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: Utterance,
    configurable: true,
  });
}

test('speech completion advances scenes, seeking cancels stale speech, and failures fall back', async () =>
  withBrowser(async (page) => {
    await page.addInitScript(fakeSpeech);
    await page.goto(url);
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByLabel('Voice', { exact: true }).locator('option'),
    ).toHaveCount(1);
    await page.getByLabel('Enable narration').check();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('#progress')).toHaveText('Beat 1 of 5');
    await page.evaluate(() => {
      window.speechSynthesis.calls[0].onend();
    });
    await expect(page.locator('#progress')).toHaveText('Beat 2 of 5');
    await page.getByLabel('Reading beat').fill('3');
    await expect(page.locator('#progress')).toHaveText('Beat 4 of 5');
    await page.evaluate(() => {
      window.speechSynthesis.calls[1].onend();
    });
    await expect(page.locator('#progress')).toHaveText('Beat 4 of 5');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const calls = await page.evaluate(
      () => window.speechSynthesis.calls.length,
    );
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.speechSynthesis.calls.length),
      calls + 1,
    );
    await page.evaluate(() =>
      window.speechSynthesis.calls
        .at(-1)
        .onerror({ error: 'synthesis-failed' }),
    );
    await expect(page.locator('#status')).toHaveText(
      'Speech was unavailable or failed. Continuing silently.',
    );
    await expect(page.getByLabel('Enable narration')).not.toBeChecked();
    await page.screenshot({ path: '/tmp/narration-prototype.png' });
  }));

test('missing local voices keeps silent playback usable', async () =>
  withBrowser(async (page) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        configurable: true,
      });
    });
    await page.goto(url);
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel('Enable narration')).toBeDisabled();
    await expect(page.locator('#status')).toContainText(
      'No local browser voice',
    );
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('#progress')).toHaveText('Beat 2 of 5', {
      timeout: 7000,
    });
  }));
