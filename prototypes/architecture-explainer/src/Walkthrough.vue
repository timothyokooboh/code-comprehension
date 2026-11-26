<script setup lang="ts">
import { computed, ref } from "vue";
import { useWalkthrough } from "./useWalkthrough";
import content from "./content.json";
import { messages } from "./messages";
const surface = ref<HTMLElement | null>(null);
const { ready, failed, playing, seconds, seek, toggle } =
  useWalkthrough(surface);
const finished = computed(() => seconds.value >= duration - 0.1);
function play() {
  if (finished.value) seek(0);
  toggle();
}
const duration = content.chapters.reduce(
  (total, chapter) => total + chapter.duration,
  0,
);
const current = computed(
  () =>
    content.chapters.findLast((chapter) => chapter.start <= seconds.value) ??
    content.chapters[0],
);
function clock(value: number) {
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
function scrub(event: Event) {
  seek(Number((event.target as HTMLInputElement).value));
}
function chapter(time: number) {
  seek(time);
}
</script>
<template>
  <section class="player" :aria-label="content.title">
    <div ref="surface" class="surface" aria-hidden="true"></div>
    <p v-if="failed" role="alert">{{ messages.error }}</p>
    <p v-else-if="!ready" role="status">{{ messages.loading }}</p>
    <div class="controls">
      <button :disabled="!ready" @click="play">
        {{
          playing ? messages.pause : finished ? messages.replay : messages.play
        }}
      </button>
      <input
        type="range"
        min="0"
        :max="duration"
        step="0.1"
        :value="seconds"
        :aria-label="messages.seek"
        :disabled="!ready"
        @input="scrub"
      />
      <span>{{ clock(seconds) }} / {{ clock(duration) }}</span>
    </div>
    <p class="caption">{{ current.subtitle }}</p>
  </section>
  <nav class="chapters" :aria-label="messages.chapters">
    <button
      v-for="(item, index) in content.chapters"
      :key="item.title"
      :class="{ active: current === item }"
      :disabled="!ready"
      @click="chapter(item.start)"
    >
      <span>{{ String(index + 1).padStart(2, "0") }}</span
      >{{ item.title }}
    </button>
  </nav>
</template>
