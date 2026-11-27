import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { messages } from './messages.mjs';
import { createReviewState, limits, ReviewError, timings } from './state.mjs';
import { assessment } from './question.mjs';

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > limits.bodyBytes) throw new ReviewError('too_large', 413);
  }
  try { return JSON.parse(body); } catch { throw new ReviewError('invalid_request'); }
}
function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
export async function startPrototype() {
  const browserToken = randomBytes(24).toString('hex');
  const reviewerToken = randomBytes(24).toString('hex');
  const state = createReviewState(assessment);
  const assets = new Map(await Promise.all(['index.html', 'browser.mjs', 'messages.mjs', 'contract.mjs', 'view.mjs'].map(async name => [name, await readFile(new URL(name, import.meta.url))])));
  let origin;
  async function handle(request, response) {
    const path = request.url;
    if (request.headers.host !== new URL(origin).host || (request.headers.origin && request.headers.origin !== origin)) throw new ReviewError('forbidden', 403);
    if (request.method === 'GET' && (path === '/' || assets.has(path.slice(1)))) {
      response.writeHead(200, { 'Content-Type': path === '/' ? 'text/html; charset=utf-8' : 'text/javascript', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
      const asset = assets.get(path === '/' ? 'index.html' : path.slice(1));
      response.end(path === '/' ? asset.toString().replace('__TITLE__', messages.title) : asset); return;
    }
    const token = request.headers.authorization;
    const agentRoute = path === '/wait' || path === '/feedback';
    if (token !== `Bearer ${agentRoute ? reviewerToken : browserToken}`) throw new ReviewError('forbidden', 403);
    if (request.method === 'GET' && path === '/state') return json(response, 200, { ...state.snapshot(), messages, timings, limits });
    if (request.method === 'POST' && path === '/submit') return json(response, 200, state.submit(await readBody(request)));
    if (request.method === 'POST' && path === '/feedback') return json(response, 200, state.review(await readBody(request)));
    if (request.method === 'GET' && path === '/wait') {
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.on('close', abort);
      const result = await state.wait(controller.signal);
      response.off('close', abort);
      if (!response.destroyed) json(response, 200, result);
      return;
    }
    throw new ReviewError('invalid_request', 404);
  }
  const server = createServer((request, response) => {
    handle(request, response).catch(error => {
      if (!response.destroyed) json(response, error instanceof ReviewError ? error.status : 500, { code: error instanceof ReviewError ? error.code : 'failed' });
    });
  });
  server.requestTimeout = timings.requestMs;
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, browserUrl: `${origin}/#${browserToken}`, reviewerToken,
    close: () => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); } };
}
