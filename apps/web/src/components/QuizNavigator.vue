<script setup lang="ts">
import { messages } from '../locales/en';

defineProps<{
  entries: { anchor: string; prompt: string; answered: boolean; correct?: boolean }[];
}>();
</script>

<template>
  <nav :aria-label="messages.workspace.navigation" class="question-nav">
    <p class="eyebrow">{{ messages.workspace.navigation }}</p>
    <ol class="mt-4 space-y-1">
      <li v-for="(entry, index) in entries" :key="entry.anchor">
        <a :href="`#${entry.anchor}`" :aria-label="messages.workspace.jumpTo(index + 1, entry.prompt)" class="question-link">
          <span class="question-index" :class="{ 'is-answered': entry.answered }" aria-hidden="true">{{ index + 1 }}</span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold leading-5">{{ entry.prompt }}</span>
            <span class="mt-1 block text-xs text-slate-500">{{ entry.correct === undefined
              ? (entry.answered ? messages.workspace.answered : messages.workspace.unanswered)
              : (entry.correct ? messages.workspace.correct : messages.workspace.review) }}</span>
          </span>
        </a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.question-link { display: flex; align-items: flex-start; gap: .75rem; padding: .75rem; border-radius: .25rem; }
.question-index { display: grid; place-items: center; flex: 0 0 1.75rem; height: 1.75rem; border: 1px solid var(--line); border-radius: .25rem; font-size: .75rem; font-variant-numeric: tabular-nums; }
.is-answered { background: var(--accent); color: var(--ink); border-color: var(--ink); box-shadow: 2px 2px 0 var(--ink); }
@media (hover: hover) and (pointer: fine) { .question-link:hover { background: var(--accent-soft); } }
@media (max-width: 1023px) {
  ol { display: flex; gap: .25rem; overflow-x: auto; margin-top: .5rem; }
  .question-link { padding: .5rem; }
  .question-link > span:last-child { display: none; }
  .question-index { width: 2rem; height: 2rem; }
}
</style>
