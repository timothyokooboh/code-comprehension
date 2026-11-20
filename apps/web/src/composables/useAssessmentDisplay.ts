import { onMounted, onScopeDispose, readonly, ref, watch, type ComputedRef } from 'vue';
import type { Quiz } from '@code-comprehension/quiz-contract';
import { publishAssessmentDisplay } from '../api/assessment';

export function useAssessmentDisplay(assessment: ComputedRef<Quiz>) {
  const unavailable = ref(false);
  const controller = new AbortController();
  let queued = false;
  let running = false;

  // Serial reports prevent a slower, older draw from overwriting the latest order.
  async function drainReports() {
    running = true;
    while (queued && !controller.signal.aborted) {
      queued = false;
      const quiz = assessment.value;
      if (!quiz.runtimeRevision) continue;
      try {
        await publishAssessmentDisplay(quiz.runtimeRevision, quiz.questions.map(({ id }) => id), controller.signal);
        unavailable.value = false;
      } catch {
        if (!controller.signal.aborted) unavailable.value = true;
      }
    }
    running = false;
  }

  function reportDisplay() {
    queued = true;
    if (!running) void drainReports();
  }

  function connect() {
    window.addEventListener('focus', reportDisplay);
    reportDisplay();
  }

  function disconnect() {
    window.removeEventListener('focus', reportDisplay);
    controller.abort();
  }

  watch(() => assessment.value.questions, reportDisplay, { flush: 'post' });
  onMounted(connect);
  onScopeDispose(disconnect);
  return { unavailable: readonly(unavailable) };
}
