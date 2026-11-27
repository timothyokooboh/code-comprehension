import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startPrototype } from './server.mjs';
import { messages } from './messages.mjs';
import { timings } from './state.mjs';

async function serve() {
  const app = await startPrototype();
  const directory = await mkdtemp(join(tmpdir(), 'comprehension-review-'));
  const file = join(directory, 'session.json');
  await writeFile(file, JSON.stringify({ origin: app.origin, reviewerToken: app.reviewerToken }), { mode: 0o600 });
  console.log(JSON.stringify({ browserUrl: app.browserUrl, sessionFile: file }));
  async function stop() { await app.close(); await rm(directory, { recursive: true, force: true }); process.exit(0); }
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
async function callAgent(command, sessionFile, feedbackFile) {
  const session = JSON.parse(await readFile(sessionFile, 'utf8'));
  const url = new URL(session.origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/') throw new Error('invalid_request');
  const body = command === 'feedback' ? await readFile(feedbackFile, 'utf8') : undefined;
  let data;
  do {
    const response = await fetch(`${url.origin}/${command}`, { method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${session.reviewerToken}`, 'Content-Type': 'application/json' },
      body, signal: AbortSignal.timeout(command === 'wait' ? timings.waitMs + timings.requestMs : timings.requestMs) });
    data = await response.json();
    if (!response.ok) throw new Error(data.code);
  } while (command === 'wait' && data.status === 'timeout');
  console.log(JSON.stringify(command === 'feedback' ? { status: 'completed', submissionId: data.submission.id } : data));
}
const [command, sessionFile, feedbackFile] = process.argv.slice(2);
try {
  if (command === 'serve') await serve();
  else if (command === 'wait' && sessionFile || command === 'feedback' && sessionFile && feedbackFile) await callAgent(command, sessionFile, feedbackFile);
  else { console.error(messages.cliUsage); process.exitCode = 1; }
} catch (error) {
  console.error(JSON.stringify({ code: error.message, message: messages.errors[error.message] ?? messages.errors.failed })); process.exitCode = 1;
}
