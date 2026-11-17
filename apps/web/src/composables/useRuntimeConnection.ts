import { onMounted, onScopeDispose, readonly, ref } from 'vue';
import { requestRuntimeStatus } from '../api/runtime';

type ConnectionState = 'connecting' | 'connected' | 'unavailable';

export function useRuntimeConnection() {
  const state = ref<ConnectionState>('connecting');
  const controller = new AbortController();

  async function connect() {
    try {
      await requestRuntimeStatus(controller.signal);
      if (!controller.signal.aborted) state.value = 'connected';
    } catch {
      if (!controller.signal.aborted) state.value = 'unavailable';
    }
  }

  onMounted(connect);
  onScopeDispose(() => controller.abort());

  return { state: readonly(state) };
}
