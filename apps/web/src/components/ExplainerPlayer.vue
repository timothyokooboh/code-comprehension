<script setup lang="ts">
import { ref } from 'vue';
import {
  explainerChapters,
  explainerDuration,
  type Explainer,
} from '@code-comprehension/quiz-contract';
import { usePlayer } from '../explainer/usePlayer';
import { explainerMessages as copy } from '../locales/explainer.en';
const props = defineProps<{ data: Explainer }>();
const container = ref<HTMLElement | null>(null);
const { status, seconds, playing, seek, toggle, replay, connect } = usePlayer(
  container,
  props.data,
);
const duration = explainerDuration(props.data);
const chapters = explainerChapters(props.data);
function seekFromInput(event: Event) {
  seek(Number((event.target as HTMLInputElement).value));
}
</script>
<template>
  <section class="player" :aria-label="copy.silent">
    <div ref="container" class="frame" role="img" :aria-label="copy.canvas" />
    <p v-if="status === 'loading'" role="status">{{ copy.loading }}</p>
    <div v-if="status === 'failed'" role="alert">
      {{ copy.renderFailed }} <button @click="connect">{{ copy.retry }}</button>
    </div>
    <div class="controls">
      <button :disabled="status !== 'ready'" @click="toggle">
        {{ playing ? copy.pause : copy.play }}
      </button>
      <button :disabled="status !== 'ready'" @click="replay">
        {{ copy.replay }}
      </button>
      <input
        :aria-label="copy.position"
        type="range"
        min="0"
        :max="duration"
        step="0.1"
        :value="seconds"
        :disabled="status !== 'ready'"
        @input="seekFromInput"
      />
      <output>{{ copy.time(seconds, duration) }}</output>
    </div>
    <nav :aria-label="copy.chapters" class="chapters">
      <button
        v-for="chapter in chapters"
        :key="chapter.scene.id"
        :disabled="status !== 'ready'"
        @click="seek(chapter.start)"
      >
        {{ chapter.scene.title }}
      </button>
    </nav>
  </section>
</template>
<style scoped>
.player {
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: #fafbf7;
}
.frame {
  aspect-ratio: 8 / 3;
  max-height: 360px;
  margin-inline: auto;
}
.frame :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}
.controls,
.chapters {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-wrap: wrap;
}
.controls input {
  flex: 1;
  min-width: 90px;
  accent-color: var(--ink);
}
button {
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
}
button:enabled {
  cursor: pointer;
}
button:enabled:hover {
  background: var(--accent);
}
button:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 3px;
}
button:disabled {
  opacity: 0.5;
}
output {
  font-variant-numeric: tabular-nums;
}
</style>
