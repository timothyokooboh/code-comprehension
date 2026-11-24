import { computed, onMounted, onScopeDispose, ref, type Ref } from 'vue';
import { questionTypes, reviewTimings, reviewErrors, type Quiz, type Answers, type ReviewSnapshot, type ReviewErrorCode } from '@code-comprehension/quiz-contract';
import { loadReview, loadReviewSession, ReviewRequestError } from '../api/written-review';
import { createReviewStorage } from '../storage/written-review';

export function useWrittenReview(quiz: Readonly<Ref<Quiz>>) {
  const enabled = quiz.value.questions.some(question => question.type === questionTypes.written);
  const storage = createReviewStorage(quiz.value.runtimeRevision);
  const snapshot = ref<ReviewSnapshot | null>(storage.saved?.snapshot ?? null);
  const error = ref<ReviewErrorCode | null>(null);
  const busy = ref(false);
  const pending = ref(storage.saved?.pending);
  const locked = computed(() => Boolean(pending.value || snapshot.value?.submission));
  const controller = new AbortController();
  let session = storage.saved?.session ?? null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function save() {
    if (session && !storage.write(session, pending.value, snapshot.value)) error.value = reviewErrors.storage;
  }
  async function connection() {
    session ??= await loadReviewSession(controller.signal);
    if (session.revision !== quiz.value.runtimeRevision) throw new ReviewRequestError(reviewErrors.stale);
    save();
    return session;
  }
  function recordError(cause: unknown) {
    if (!controller.signal.aborted) error.value = cause instanceof ReviewRequestError ? cause.code : reviewErrors.unavailable;
  }
  function accept(next: ReviewSnapshot) {
    // A slower pre-submit poll must not roll back an acknowledged submission or feedback.
    if (snapshot.value?.feedback && !next.feedback || snapshot.value?.submission && !next.submission) return;
    snapshot.value = next;
    error.value = null;
    save();
  }
  async function reconcile() {
    const current = await connection();
    const next = await loadReview(current, controller.signal);
    if (pending.value && !next.submission && !busy.value) accept(await loadReview(current, controller.signal, pending.value));
    else accept(next);
  }
  async function poll() {
    try { await reconcile(); } catch (cause) { recordError(cause); }
    if (!controller.signal.aborted && !snapshot.value?.feedback) timer = setTimeout(poll, reviewTimings.pollMs);
  }
  async function submit(answers: Answers) {
    busy.value = true;
    try {
      const current = await connection();
      pending.value ??= { protocolVersion: current.protocolVersion, sessionId: current.sessionId, revision: current.revision,
        attemptId: crypto.randomUUID(), submissionId: crypto.randomUUID(),
        questionIds: quiz.value.questions.map(q => q.id),
        answers: Object.fromEntries([...answers].map(([id, answer]) => [id, [...answer]])) };
      save();
      accept(await loadReview(current, controller.signal, pending.value));
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
