import './style.css';
import { mountPlayer } from '../../apps/web/src/explainer/player.ts';
import { walkthrough } from './content.js';
import { messages } from './messages.js';
import { createPlayback } from './playback.js';

const element = (id) => document.getElementById(id);
const play = element('play'),
  replay = element('replay'),
  position = element('position');
const narration = element('narration'),
  voice = element('voice'),
  status = element('status');
document.title = messages.title;
for (const [id, key] of Object.entries({
  heading: 'heading',
  introduction: 'introduction',
  'narration-label': 'narration',
  'voice-label': 'voice',
  note: 'note',
  replay: 'replay',
}))
  element(id).textContent = messages[key];
voice.setAttribute('aria-label', messages.voice);
position.setAttribute('aria-label', messages.position);
play.textContent = messages.play;
status.textContent = messages.loading;
let start = 0;
const beats = walkthrough.scenes.flatMap((scene) =>
  scene.beats.map((beat) => {
    const result = { ...beat, start };
    start += beat.durationSeconds;
    return result;
  }),
);
position.max = String(beats.length - 1);
let player;
let playback;
let ready = false;
function update(state) {
  play.textContent = state.playing ? messages.pause : messages.play;
  position.value = String(state.index);
  narration.checked = state.enabled;
  narration.disabled = !ready || !state.voices.length;
  voice.disabled = !ready || !state.voices.length;
  const options = state.voices.map((item) => {
    const option = document.createElement('option');
    option.value = item.voiceURI;
    option.textContent = messages.localVoice(item);
    return option;
  });
  voice.replaceChildren(...options);
  voice.value = state.voiceURI;
  element('progress').textContent = messages.progress(
    state.index,
    beats.length,
  );
  status.textContent = state.failed
    ? messages.failed
    : state.ended
      ? messages.ended
      : !state.voices.length
        ? messages.unavailable
        : state.playing
          ? state.enabled
            ? messages.speaking
            : messages.silent
          : messages.ready;
}
function markReady() {
  ready = true;
  play.disabled = false;
  replay.disabled = false;
  position.disabled = false;
  if (!playback)
    playback = createPlayback(
      beats,
      (time) => player?.seek(time + 0.05),
      update,
    );
}
function failed() {
  ready = false;
  playback?.dispose();
  play.disabled = true;
  replay.disabled = true;
  position.disabled = true;
  status.textContent = messages.renderFailed;
}
function disconnect() {
  playback?.dispose();
  player?.dispose();
}
play.addEventListener('click', () => playback?.toggle());
replay.addEventListener('click', () => playback?.replay());
position.addEventListener('input', () =>
  playback?.seek(Number(position.value)),
);
narration.addEventListener('change', () =>
  playback?.narration(narration.checked),
);
voice.addEventListener('change', () => playback?.voice(voice.value));
window.addEventListener('pagehide', disconnect, { once: true });
try {
  player = mountPlayer(element('canvas'), walkthrough, {
    ready: markReady,
    failed,
    frame: () => {},
    playing: () => {},
  });
} catch {
  failed();
}
