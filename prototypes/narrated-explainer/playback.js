const speechStartTimeoutMs = 10_000;
const speechCompletionTimeoutMs = 60_000;

export function createPlayback(beats, renderBeat, update) {
  const speech = window.speechSynthesis;
  const supported = Boolean(speech && window.SpeechSynthesisUtterance);
  const state = {
    index: 0,
    playing: false,
    enabled: false,
    voices: [],
    voiceURI: '',
    failed: false,
    ended: false,
  };
  let timer;
  let activeUtterance;
  let generation = 0;
  let disposed = false;

  function publish() {
    if (!disposed) update({ ...state });
  }
  function cancel() {
    generation++;
    clearTimeout(timer);
    activeUtterance = undefined;
    if (supported) speech.cancel();
  }
  function discoverVoices() {
    if (disposed) return;
    try {
      state.voices = supported
        ? speech.getVoices().filter((voice) => voice.localService)
        : [];
    } catch {
      state.voices = [];
    }
    if (!state.voices.some((voice) => voice.voiceURI === state.voiceURI)) {
      state.voiceURI =
        (
          state.voices.find((voice) => voice.lang.startsWith('en')) ??
          state.voices[0]
        )?.voiceURI ?? '';
      if (state.enabled && !state.voiceURI) fallback();
    }
    publish();
  }
  function advance(token) {
    if (disposed || token !== generation || !state.playing) return;
    if (state.index === beats.length - 1) {
      cancel();
      state.playing = false;
      state.ended = true;
      publish();
      return;
    }
    state.index++;
    startBeat();
  }
  function fallback() {
    cancel();
    state.enabled = false;
    state.failed = true;
    if (state.playing) startBeat();
    else publish();
  }
  function speak(token) {
    const utterance = new SpeechSynthesisUtterance(beats[state.index].text);
    activeUtterance = utterance;
    utterance.voice = state.voices.find(
      (voice) => voice.voiceURI === state.voiceURI,
    );
    utterance.lang = utterance.voice?.lang ?? 'en-US';
    utterance.rate = 1;
    function failed() {
      if (token === generation && !disposed) fallback();
    }
    utterance.onstart = () => {
      if (token !== generation || disposed) return;
      clearTimeout(timer);
      timer = setTimeout(failed, speechCompletionTimeoutMs);
    };
    utterance.onend = () => {
      if (token === generation) {
        clearTimeout(timer);
        advance(token);
      }
    };
    utterance.onerror = failed;
    timer = setTimeout(failed, speechStartTimeoutMs);
    try {
      speech.speak(activeUtterance);
    } catch {
      failed();
    }
  }
  function startBeat() {
    cancel();
    renderBeat(beats[state.index].start);
    if (state.playing) {
      const token = generation;
      if (state.enabled && state.voiceURI) speak(token);
      else
        timer = setTimeout(
          () => advance(token),
          beats[state.index].durationSeconds * 1000,
        );
    }
    publish();
  }
  function toggle() {
    if (state.ended) {
      state.index = 0;
      state.ended = false;
    }
    state.playing = !state.playing;
    startBeat();
  }
  function seek(index) {
    state.index = Math.max(0, Math.min(beats.length - 1, index));
    state.ended = false;
    startBeat();
  }
  function narration(enabled) {
    state.enabled = Boolean(enabled && state.voiceURI);
    state.failed = false;
    startBeat();
  }
  function voice(uri) {
    state.voiceURI = uri;
    startBeat();
  }
  function replay() {
    state.index = 0;
    state.ended = false;
    state.playing = true;
    startBeat();
  }
  function dispose() {
    disposed = true;
    cancel();
    speech?.removeEventListener('voiceschanged', discoverVoices);
  }
  speech?.addEventListener('voiceschanged', discoverVoices);
  discoverVoices();
  return { toggle, seek, narration, voice, replay, dispose };
}
