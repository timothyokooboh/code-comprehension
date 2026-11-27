import { messages } from './messages.mjs';
import { validAnswers } from './contract.mjs';
import { element, buildForm, readAnswers, renderResults } from './view.mjs';
const initialRequestTimeoutMs = 5000;
const initialPollIntervalMs = 1500;
const token = location.hash.slice(1) || sessionStorage.getItem('written-review-token');
if (token) sessionStorage.setItem('written-review-token', token);
history.replaceState(null, '', '/');
const draftKey = `written-review:mixed:${token}`;
let settings;
let current;
let busy = false;
let renderedResult = '';
let draft;
try { draft = JSON.parse(localStorage.getItem(draftKey)); } catch { /* Draft storage is optional. */ }
if (!draft || typeof draft.id !== 'string' || !draft.answers) draft = { id: crypto.randomUUID(), answers: {} };
function persistDraft() {
  draft.answers = readAnswers(settings.questions);
  try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* Keep the in-memory draft. */ }
  updateSubmit();
}
function updateSubmit() {
  element('submit').disabled = busy || Boolean(current?.submission) ||
    !validAnswers(draft.answers, settings.questions, settings.limits.answerCharacters);
}
async function request(path, body) {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(settings?.timings.requestMs ?? initialRequestTimeoutMs) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.code);
  return result;
}
function configure(data) {
  settings = data;
  document.title = messages.title;
  for (const key of ['eyebrow', 'heading', 'introduction']) element(key).textContent = messages[key];
  element('submit').textContent = messages.submit;
  element('results-title').textContent = messages.results;
  buildForm(data.questions, data.submission?.answers ?? draft.answers, data.limits.answerCharacters);
}
function render(data) {
  current = data;
  element('status').textContent = messages[data.reviewer === 'disconnected' && data.submission ? 'queuedDisconnected' : data.reviewer];
  for (const field of element('questions').querySelectorAll('fieldset')) field.disabled = Boolean(data.submission);
  updateSubmit();
  if (!data.submission) return;
  const key = JSON.stringify([data.submission.id, data.feedback]);
  if (key === renderedResult) return;
  renderedResult = key;
  element('feedback').hidden = false;
  renderResults(data);
  const heading = element('results-title');
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: 'start', behavior: 'instant' });
}
async function sync() {
  try {
    const data = await request('/state');
    if (!settings) configure(data);
    render(data);
    element('error').textContent = '';
  } catch {
    element('submit').disabled = true;
    element('error').textContent = messages.serverUnavailable;
  }
  if (!current?.feedback) setTimeout(sync, settings?.timings.pollMs ?? initialPollIntervalMs);
}
async function submit(event) {
  event.preventDefault(); persistDraft(); busy = true; updateSubmit();
  try { render(await request('/submit', draft)); element('error').textContent = ''; }
  catch (error) { element('error').textContent = messages.errors[error.message] ?? messages.errors.failed; }
  finally { busy = false; if (current) render(current); }
}
element('form').addEventListener('input', persistDraft);
element('form').addEventListener('submit', submit);
void sync();
