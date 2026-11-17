import { onMounted, onScopeDispose, readonly, ref } from 'vue';
import { requestRuntimeStatus } from '../api/runtime';
import { RuntimeConnectionError, runtimeErrorCodes, type RuntimeErrorCode } from '../api/runtime-errors';

export const connectionStates = {
  connecting: 'connecting',
  connected: 'connected',
  failed: 'failed',
} as const;

type ConnectionState =
  | { status: typeof connectionStates.connecting | typeof connectionStates.connected }
  | { status: typeof connectionStates.failed; errorCode: RuntimeErrorCode };

export function useRuntimeConnection() {
  const state = ref<ConnectionState>({ status: connectionStates.connecting });
  const controller = new AbortController();

  async function connect() {
    try {
      await requestRuntimeStatus(controller.signal);
      if (!controller.signal.aborted) state.value = { status: connectionStates.connected };
    } catch (error) {
      if (!controller.signal.aborted) {
        state.value = {
          status: connectionStates.failed,
          errorCode: error instanceof RuntimeConnectionError ? error.code : runtimeErrorCodes.unavailable,
        };
      }
    }
  }

  onMounted(connect);
  onScopeDispose(() => controller.abort());

  return { state: readonly(state) };
}
