import { expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { launchCli } from '../support/cli.js';

const quizFile = fileURLToPath(new URL('../fixtures/quiz.json', import.meta.url));

test('the CLI loads a valid quiz file into the local assessment session', async () => {
  const app = await launchCli(['--quiz', quizFile]);
  try {
    const response = await fetch(`${app.url}/api/quiz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'payment-retries', questions: [{ id: 'retry' }, { id: 'guarantees' }] });
  } finally {
    await app.stop();
  }
});
