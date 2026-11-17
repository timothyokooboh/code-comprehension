import type { RuntimeStatus } from '@code-comprehension/quiz-contract';

const connectionTimeoutMs = 5_000;

export async function requestRuntimeStatus(signal: AbortSignal): Promise<RuntimeStatus> {
  const response = await fetch('/api/status', {
    signal: AbortSignal.any([signal, AbortSignal.timeout(connectionTimeoutMs)]),
  });
  if (!response.ok) throw new Error(`Runtime request failed (${response.status})`);

  const runtime: RuntimeStatus = await response.json();
  if (runtime.status !== 'ready') throw new Error('Runtime is not ready');
  return runtime;
}
