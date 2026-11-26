import { onMounted, onBeforeUnmount, ref, shallowRef } from 'vue';
import { type Explainer } from '@code-comprehension/quiz-contract';
import { requestExplainer } from '../api/explainer';
export function useExplainer() {
  const data = shallowRef<Explainer>();
  const status = ref<'loading' | 'ready' | 'failed'>('loading');
  let request: AbortController | undefined;
  async function load() {
    request?.abort();
    const current = new AbortController();
    request = current;
    status.value = 'loading';
    try {
      const parsed = await requestExplainer(current.signal);
      if (current.signal.aborted) return;
      data.value = parsed;
      status.value = 'ready';
    } catch {
      if (!current.signal.aborted) status.value = 'failed';
    }
  }
  function disconnect() {
    request?.abort();
  }
  onMounted(load);
  onBeforeUnmount(disconnect);
  return { data, status, load };
}
