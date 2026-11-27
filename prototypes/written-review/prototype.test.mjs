import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { startPrototype } from './server.mjs';
import { assessment } from './question.mjs';

async function request(app, path, body, token = app.reviewerToken) {
  return fetch(app.origin + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
}
test('disconnected submission queues answers and a reconnected reviewer delivers feedback without resubmission', async () => {
  const app = await startPrototype();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(app.browserUrl);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').nth(0).check();
    await page.getByRole('checkbox').nth(2).check();
    await page.getByRole('textbox').nth(0).fill('The open form stays unchanged; reload creates a new attempt.');
    await page.getByRole('textbox').nth(1).fill('Hashes detect content changes. Review the evidence before retention.');
    await page.reload();
    assert.match(await page.getByRole('textbox').first().inputValue(), /open form/);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await page.getByText(/No need to submit again/).waitFor();
    await page.getByRole('heading', { name: 'MCQs: 2 of 2 correct' }).waitFor();
    const job = await (await request(app, '/wait')).json();
    assert.equal(job.status, 'submitted');
    assert.match(job.submission.answers['replacement-attempt'], /open form/);
    assert.equal(Object.keys(job.submission.answers).length, 2);
    await page.getByRole('heading', { name: 'MCQs: 2 of 2 correct' }).waitFor();
    assert.equal(job.questions.length, 2);
    const result = { submissionId: job.submission.id, reviews: job.questions.map(question => ({ questionId: question.id, verdict: 'partial', summary: 'The behaviour is right; explain the mechanism.', understood: 'The main behaviour.', missing: 'The identity or retention mechanism.', references: question.references })) };
    assert.equal((await request(app, '/feedback', { ...result, submissionId: randomUUID() })).status, 409);
    assert.equal((await request(app, '/feedback', { ...result, reviews: [result.reviews[0]] })).status, 400);
    assert.equal((await request(app, '/feedback', result)).status, 200);
    await page.getByRole('heading', { name: 'Partly correct' }).first().waitFor();
    assert.equal(await page.locator('#results-title').evaluate(el => el === document.activeElement), true);
    assert.ok((await page.locator('#feedback').boundingBox()).y < (await page.getByRole('textbox').first().boundingBox()).y);
    await page.reload();
    await page.getByRole('heading', { name: 'Partly correct' }).first().waitFor();
    assert.equal((await request(app, '/feedback', result)).status, 200);
    await page.screenshot({ path: '/tmp/written-review-prototype.png', fullPage: true });
  } finally { await browser.close(); await app.close(); }
});
test('unauthorized access is rejected; cancelling a wait disconnects the reviewer', async () => {
  const app = await startPrototype();
  const token = new URL(app.browserUrl).hash.slice(1);
  try {
    assert.equal((await request(app, '/submit', { id: randomUUID(), answers: { count: ['two'], refresh: ['generate', 'keep'], 'replacement-attempt': 'A response', 'source-review': 'Another response' } }, 'invalid-token')).status, 403);
    assert.equal((await request(app, '/wait', undefined, token)).status, 403);
    assert.equal((await fetch(app.origin + '/state', { headers: { Authorization: `Bearer ${token}`, Origin: 'https://example.org' } })).status, 403);
    const controller = new AbortController();
    const waiting = fetch(app.origin + '/wait', { headers: { Authorization: `Bearer ${app.reviewerToken}` }, signal: controller.signal }).catch(() => {});
    for (let i = 0; i < 50; i++) {
      const state = await (await request(app, '/state', undefined, token)).json();
      if (state.reviewer === 'waiting') break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    controller.abort(); await waiting;
    let state;
    for (let i = 0; i < 50; i++) {
      state = await (await request(app, '/state', undefined, token)).json();
      if (state.reviewer === 'disconnected') break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(state.reviewer, 'disconnected');
  } finally { await app.close(); }
});
