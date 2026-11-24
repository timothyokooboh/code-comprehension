import { computed, onMounted, onScopeDispose, ref, type Ref } from 'vue';
import { questionTypes, reviewTimings, reviewErrors, type Quiz, type Answers, type ReviewSnapshot, type ReviewRetake, type ReviewErrorCode } from '@code-comprehension/quiz-contract';
import { loadReview, loadReviewSession, retakeReview, ReviewRequestError } from '../api/written-review';
import { createReviewStorage } from '../storage/written-review';

export function useWrittenReview(quiz: Readonly<Ref<Quiz>>) {
  const enabled = quiz.value.questions.some(question => question.type === questionTypes.written);
  const storage = createReviewStorage(quiz.value.runtimeRevision);
  const snapshot = ref<ReviewSnapshot | null>(storage.saved?.snapshot ?? null);
  const error = ref<ReviewErrorCode | null>(null);
  const busy = ref(false);
  const pending = ref(storage.saved?.pending);
  const pendingRetake = ref<ReviewRetake | undefined>(storage.saved?.retake);
  const locked = computed(() => Boolean(pending.value || pendingRetake.value || snapshot.value?.submission));
  const controller = new AbortController();
  let session = storage.saved?.session ?? null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let operations = Promise.resolve();

  function serialize<T>(action: () => Promise<T>) {
    const next = operations.then(action);
    operations = next.then(() => {}, () => {});
    return next;
  }
  function save() {
    if (session && !storage.write(session, pending.value, snapshot.value, pendingRetake.value)) error.value = reviewErrors.storage;
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
    if (next.revision !== quiz.value.runtimeRevision) throw new ReviewRequestError(reviewErrors.stale);
    if (pending.value && pending.value.attemptId !== next.attemptId) pending.value = undefined;
    if (pendingRetake.value && pendingRetake.value.attemptId !== next.attemptId) pendingRetake.value = undefined;
    snapshot.value = next;
    if (session) session.attemptId = next.attemptId;
    error.value = null;
    save();
  }
  async function reconcile() {
    const current = await connection();
    const next = await loadReview(current, controller.signal);
    if (next.revision !== current.revision) throw new ReviewRequestError(reviewErrors.stale);
    if (pendingRetake.value && pendingRetake.value.attemptId === next.attemptId) {
      accept(await retakeReview(current, controller.signal, pendingRetake.value));
    } else if (pending.value && pending.value.attemptId === next.attemptId && !next.submission) {
      accept(await loadReview(current, controller.signal, pending.value));
    } else accept(next);
  }
  async function poll() {
    try { await serialize(reconcile); } catch (cause) { recordError(cause); }
    if (!controller.signal.aborted) timer = setTimeout(poll, reviewTimings.pollMs);
  }
  async function perform(action: () => Promise<void>) {
    busy.value = true;
    try { await serialize(action); return true; }
    catch (cause) { recordError(cause); return false; }
    finally { busy.value = false; }
  }
  function submit(answers: Answers) {
    const expectedAttemptId = session?.attemptId;
    const questionIds = quiz.value.questions.map(q => q.id);
    const response = Object.fromEntries([...answers].map(([id, answer]) => [id, [...answer]]));
    return perform(async () => {
      const current = await connection();
      assertOriginalAttempt(expectedAttemptId, current.attemptId);
      pending.value ??= { protocolVersion: current.protocolVersion, sessionId: current.sessionId, revision: current.revision,
        attemptId: current.attemptId, submissionId: crypto.randomUUID(),
        questionIds, answers: response };
      save();
      accept(await loadReview(current, controller.signal, pending.value));
    });
  }
  function assertOriginalAttempt(expected: string | undefined, current: string) {
    if (!expected) throw new ReviewRequestError(reviewErrors.unavailable);
    if (expected !== current) throw new ReviewRequestError(reviewErrors.stale);
  }
  function retake(questionIds: string[]) {
    const expectedAttemptId = session?.attemptId;
    return perform(async () => {
      const current = await connection();
      assertOriginalAttempt(expectedAttemptId, current.attemptId);
      pendingRetake.value ??= { protocolVersion: current.protocolVersion, sessionId: current.sessionId, revision: current.revision,
        attemptId: current.attemptId, nextAttemptId: crypto.randomUUID(), questionIds };
      save();
      accept(await retakeReview(current, controller.signal, pendingRetake.value));
    });
  }
  function start() { if (enabled) void poll(); }
  function stop() { controller.abort(); clearTimeout(timer); }
  onMounted(start);
  onScopeDispose(stop);
  return { enabled, snapshot, error, busy, locked, submit, retake };
}
