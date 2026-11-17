import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { applicationName, type RuntimeStatus } from '@code-comprehension/quiz-contract';
import { loadAssets } from './assets.js';

export async function startServer(port: number) {
  const assets = await loadAssets(fileURLToPath(new URL('./web/', import.meta.url)));
  const status: RuntimeStatus = { name: applicationName, status: 'ready' };
  const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = (request.url ?? '/').split('?')[0];
    if (pathname === '/api/status') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify(status));
      return;
    }
    const asset = assets.get(pathname ?? '/');
    if (!asset) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': asset.contentType, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : asset.body);
  });

  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No local server address available.');

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
