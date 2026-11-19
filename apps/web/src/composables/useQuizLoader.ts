import { onMounted, onScopeDispose, ref, shallowReadonly } from 'vue';
import type { Quiz } from '@code-comprehension/quiz-contract';
import { requestQuiz } from '../api/quiz';
import { QuizLoadError, quizLoadErrorCodes, type QuizLoadErrorCode } from '../api/quiz-errors';

export const quizLoadStates = { loading: 'loading', loaded: 'loaded', failed: 'failed' } as const;
type LoadState =
  | { status: typeof quizLoadStates.loading }
  | { status: typeof quizLoadStates.loaded; quiz: Quiz | null }
  | { status: typeof quizLoadStates.failed; errorCode: QuizLoadErrorCode };

export function useQuizLoader() {
  const state = ref<LoadState>({ status: quizLoadStates.loading });
  const controller = new AbortController();

  async function load() {
    try {
      const quiz = await requestQuiz(controller.signal);
      if (!controller.signal.aborted) state.value = { status: quizLoadStates.loaded, quiz };
    } catch (error) {
      if (!controller.signal.aborted) state.value = {
        status: quizLoadStates.failed,
        errorCode: error instanceof QuizLoadError ? error.code : quizLoadErrorCodes.unavailable,
      };
    }
  }

  onMounted(load);
  onScopeDispose(() => controller.abort());
  return { state: shallowReadonly(state) };
}
