import { runtimeReadyStatus, runtimeStatusPath, type RuntimeStatus } from '@code-comprehension/quiz-contract';
import { RuntimeConnectionError, runtimeErrorCodes } from './runtime-errors';

const connectionTimeoutMs = 5_000;

async function fetchRuntime(signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(runtimeStatusPath, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(connectionTimeoutMs)]),
    });
  } catch (cause) {
    throw new RuntimeConnectionError(runtimeErrorCodes.unavailable, { cause });
  }
  if (!response.ok) throw new RuntimeConnectionError(runtimeErrorCodes.unavailable);
  return response;
}

async function readRuntime(response: Response): Promise<RuntimeStatus> {
  let runtime: unknown;
  try {
    runtime = await response.json();
  } catch (cause) {
    throw new RuntimeConnectionError(runtimeErrorCodes.invalidResponse, { cause });
  }
  if (typeof runtime !== 'object' || runtime === null ||
      !('name' in runtime) || typeof runtime.name !== 'string' ||
      !('status' in runtime) || typeof runtime.status !== 'string') {
    throw new RuntimeConnectionError(runtimeErrorCodes.invalidResponse);
  }
  if (runtime.status !== runtimeReadyStatus) {
    throw new RuntimeConnectionError(runtimeErrorCodes.notReady);
  }
  return { name: runtime.name, status: runtimeReadyStatus };
}

export async function requestRuntimeStatus(signal: AbortSignal): Promise<RuntimeStatus> {
  const response = await fetchRuntime(signal);
  return readRuntime(response);
}
