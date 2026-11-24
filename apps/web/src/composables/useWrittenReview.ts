import { onMounted, onScopeDispose, ref, type Ref } from 'vue';
import { questionTypes, reviewTimings, reviewErrors, type Quiz, type Answers, type ReviewSession, type ReviewSnapshot, type ReviewSubmission, type ReviewErrorCode } from '@code-comprehension/quiz-contract';
import { loadReview, loadReviewSession, ReviewRequestError } from '../api/written-review';

export function useWrittenReview(quiz: Readonly<Ref<Quiz>>) {
  const enabled = quiz.value.questions.some(question => question.type === questionTypes.written);
  const snapshot = ref<ReviewSnapshot | null>(null);
  const error = ref<ReviewErrorCode | null>(null);
  const busy = ref(false);
  const locked = ref(false);
  const controller = new AbortController();
  let session: ReviewSession | null = null;
  let pending: ReviewSubmission | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function connection() {
    session ??= await loadReviewSession(controller.signal);
    if (session.revision !== quiz.value.runtimeRevision) throw new ReviewRequestError(reviewErrors.stale);
    return session;
  }
  function recordError(cause: unknown) {
    if (!controller.signal.aborted) error.value = cause instanceof ReviewRequestError ? cause.code : reviewErrors.unavailable;
  }
  async function poll() {
    try {
      snapshot.value = await loadReview(await connection(), controller.signal);
      error.value = null;
    } catch (cause) { recordError(cause); }
    if (!controller.signal.aborted && !snapshot.value?.feedback) timer = setTimeout(poll, reviewTimings.pollMs);
  }
  async function submit(answers: Answers) {
    busy.value = true;
    try {
      const current = await connection();
      pending ??= { protocolVersion: current.protocolVersion, sessionId: current.sessionId, revision: current.revision,
        attemptId: crypto.randomUUID(), submissionId: crypto.randomUUID(),
        questionIds: quiz.value.questions.map(q => q.id),
        answers: Object.fromEntries([...answers].map(([id, answer]) => [id, [...answer]])) };
      locked.value = true;
      snapshot.value = await loadReview(current, controller.signal, pending);
      error.value = null;
      return true;
    } catch (cause) { recordError(cause); return false; }
    finally { busy.value = false; }
  }
  function start() { if (enabled) void poll(); }
  function stop() { controller.abort(); clearTimeout(timer); }
  onMounted(start);
  onScopeDispose(stop);
  return { enabled, snapshot, error, busy, locked, submit };
}
