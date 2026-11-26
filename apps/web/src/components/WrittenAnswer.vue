<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { reviewLimits } from '@code-comprehension/quiz-contract';
import { useDictation } from '../composables/useDictation';
import { appendTranscript, speechErrors, speechStates } from '../speech/recognition';
import { messages } from '../locales/en';

const props = defineProps<{ id: string; answer: string; readonly: boolean }>();
const emit = defineEmits<{ answer: [value: string[]]; recording: [active: boolean] }>();
const textarea = useTemplateRef('textarea');
const stopButton = useTemplateRef('stopButton');
const cancelButton = useTemplateRef('cancelButton');
const limited = ref(false);
const speech = useDictation(append);
const { state, active, levels, error, supported } = speech;
function append(transcript: string) {
  if (props.readonly) return;
  const combined = appendTranscript(props.answer, transcript);
  limited.value = combined.length > reviewLimits.answerCharacters;
  emit('answer', [combined.slice(0, reviewLimits.answerCharacters)]);
}
function update(event: Event) { emit('answer', [(event.target as HTMLTextAreaElement).value]); }
function start() { limited.value = false; void speech.start(); }
watch(active, async value => {
  emit('recording', value);
  await nextTick();
  if (!value && textarea.value) {
    textarea.value.focus();
    textarea.value.setSelectionRange(textarea.value.value.length, textarea.value.value.length);
  }
  else cancelButton.value?.focus();
}, { flush: 'sync' });
watch(state, async value => { if (value === speechStates.listening) { await nextTick(); stopButton.value?.focus(); } });
watch(() => props.readonly, value => { if (value) speech.cancel(); });
onBeforeUnmount(() => { speech.cancel(); emit('recording', false); });
</script>

<template>
  <div class="answer-editor">
    <div v-if="active" class="recording-surface" @keydown.esc.prevent="speech.cancel">
      <div class="recording-pill" role="group" :aria-label="messages.speech.recording">
        <button ref="cancelButton" type="button" class="recording-button" :aria-label="messages.speech.cancel" :title="messages.speech.cancel" @click="speech.cancel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <div class="waveform" aria-hidden="true">
          <span v-for="(level, index) in levels" :key="index" class="wave-bar" :style="{ transform: `scaleY(${Math.max(.08, level)})` }" />
        </div>
        <button ref="stopButton" type="button" class="recording-button stop-button" :disabled="state !== speechStates.listening"
          :aria-label="messages.speech.stop" :title="messages.speech.stop" @click="speech.stop">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="2" /></svg>
        </button>
      </div>
      <p role="status" class="recording-status">{{ messages.speech.states[state] }}</p>
    </div>
    <template v-else>
      <textarea :id="id" ref="textarea" :value="answer" :readonly="readonly" :maxlength="reviewLimits.answerCharacters" rows="3"
        :placeholder="messages.written.placeholder" class="answer-input" @input="update" />
      <button type="button" class="microphone-button" :disabled="readonly || !supported"
        :aria-label="messages.speech.start" :title="supported ? messages.speech.start : messages.speech.errors.unsupported" @click="start">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
        </svg>
      </button>
    </template>
  </div>
  <p v-if="error || limited" role="alert" class="mt-2 text-sm text-amber-900">{{ messages.speech.errors[limited ? speechErrors.limit : error!] }}</p>
  <p v-else-if="!readonly" class="mt-2 text-xs text-zinc-500">{{ supported ? messages.speech.privacy : messages.speech.errors.unsupported }}</p>
</template>

<style scoped>
.answer-editor { position: relative; }
.answer-input {
  width: 100%; height: 10rem; border: 1px solid var(--line); border-radius: .875rem; background: #fff;
  box-shadow: 0 2px 4px rgb(0 0 0 / 4%), 0 8px 24px -12px rgb(0 0 0 / 16%);
}
.answer-input { display: block; resize: none; padding: 1rem 1rem 4.25rem; line-height: 1.75; }
.answer-input:focus-visible, button:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
.microphone-button, .recording-button {
  display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 50%; flex-shrink: 0;
  transition: background-color 150ms ease, transform 150ms cubic-bezier(.23, 1, .32, 1);
}
.microphone-button { position: absolute; right: 1rem; bottom: 1rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
button:enabled { cursor: pointer; }
button:disabled { opacity: .45; cursor: not-allowed; }
button:enabled:active { transform: scale(.97); }
.recording-surface { display: flex; flex-direction: column; padding: .5rem 0; gap: .75rem; }
.recording-pill { display: flex; align-items: center; gap: 1rem; border-radius: 999px; padding: .5rem; background: #343434; color: #fff; }
.recording-button { background: #444; }
.recording-button:focus-visible { outline-color: #fff; }
.stop-button { background: #fff; color: #222; }
.waveform { display: flex; flex: 1; min-width: 0; height: 2.5rem; align-items: center; justify-content: space-between; gap: 3px; overflow: hidden; }
.wave-bar { flex: 1; max-width: 3px; min-width: 1px; height: 100%; border-radius: 999px; background: #aaa; }
.recording-status { text-align: center; font-size: .75rem; color: var(--muted); }
@media (hover: hover) and (pointer: fine) {
  .microphone-button:enabled:hover { background: var(--accent-soft); }
  .recording-button:enabled:hover { background: #595959; }
  .stop-button:enabled:hover { background: #e3f86b; }
}
@media (prefers-reduced-motion: reduce) {
  button { transition: none; }
  button:enabled:active { transform: none; }
  .wave-bar { transform: scaleY(.15) !important; }
}
</style>
