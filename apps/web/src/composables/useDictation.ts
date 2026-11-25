import { computed, onScopeDispose, ref } from 'vue';
import { createAudioMeter } from '../speech/audio-meter';
import { recognitionConstructor, recognitionError, speechErrors, speechStates, type Recognition, type SpeechError, type SpeechState } from '../speech/recognition';

const finishTimeoutMs = 5_000;
const startupTimeoutMs = 15_000;
let cancelActive: (() => void) | undefined;

export function useDictation(commit: (text: string) => void) {
  const state = ref<SpeechState>(speechStates.idle);
  const error = ref<SpeechError | null>(null);
  const levels = ref<number[]>([]);
  const supported = Boolean(recognitionConstructor() && navigator.mediaDevices?.getUserMedia);
  const active = computed(() => state.value !== speechStates.idle);
  let generation = 0;
  let recognition: Recognition | undefined;
  let stream: MediaStream | undefined;
  let meter: ReturnType<typeof createAudioMeter> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let transcript = '';

  function release() {
    generation++;
    clearTimeout(timeout);
    if (recognition) {
      recognition.onresult = recognition.onstart = recognition.onerror = recognition.onend = null;
      try { recognition.abort(); } catch { /* Already ended by the browser. */ }
      recognition = undefined;
    }
    meter?.close(); meter = undefined;
    stream?.getTracks().forEach(track => track.stop()); stream = undefined;
    state.value = speechStates.idle;
    levels.value = [];
    if (cancelActive === cancel) cancelActive = undefined;
  }
  function cancel() { release(); transcript = ''; }
  function finish(problem?: SpeechError) {
    const text = transcript.trim();
    release();
    transcript = '';
    if (text) commit(text);
    error.value = problem ?? (text ? null : speechErrors.empty);
  }
  async function start() {
    if (active.value) return;
    if (!supported) { error.value = speechErrors.unsupported; return; }
    cancelActive?.();
    cancelActive = cancel;
    error.value = null;
    transcript = '';
    state.value = speechStates.requesting;
    const current = ++generation;
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (current !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      meter = createAudioMeter(stream, value => { levels.value = value; });
      const Constructor = recognitionConstructor()!;
      recognition = new Constructor();
      recognition.lang = document.documentElement.lang || navigator.language;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onstart = () => {
        if (current !== generation) return;
        clearTimeout(timeout);
        state.value = speechStates.listening;
      };
      recognition.onresult = event => {
        if (current !== generation) return;
        transcript = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' ');
      };
      recognition.onerror = event => { if (current === generation) finish(recognitionError(event.error)); };
      recognition.onend = () => {
        if (current === generation) finish(state.value === speechStates.stopping ? undefined : speechErrors.interrupted);
      };
      timeout = setTimeout(() => finish(speechErrors.failed), startupTimeoutMs);
      recognition.start();
    } catch (cause) {
      if (current === generation) finish(recognitionError(cause instanceof Error ? cause.name : ''));
    }
  }
  function stop() {
    if (state.value !== speechStates.listening) return;
    state.value = speechStates.stopping;
    timeout = setTimeout(() => finish(speechErrors.interrupted), finishTimeoutMs);
    try { recognition?.stop(); } catch { finish(speechErrors.failed); }
  }
  window.addEventListener('pagehide', cancel);
  onScopeDispose(() => { window.removeEventListener('pagehide', cancel); cancel(); });
  return { state, active, supported, levels, error, start, stop, cancel };
}
