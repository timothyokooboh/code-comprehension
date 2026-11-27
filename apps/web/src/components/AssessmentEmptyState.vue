<script setup lang="ts">
import { computed } from 'vue';
import { quizLoadErrorCodes, type QuizLoadErrorCode } from '../api/quiz-errors';
import { messages } from '../locales/en';

const props = defineProps<{ errorCode?: QuizLoadErrorCode }>();
const copy = messages.assessment.recovery;
const invalid = computed(() => props.errorCode === quizLoadErrorCodes.invalidResponse);
const title = computed(() => !props.errorCode ? messages.assessment.emptyTitle
  : invalid.value ? copy.invalidTitle : copy.title);

function reloadPage() {
  window.location.reload();
}
</script>

<template>
  <section class="empty-state" aria-labelledby="assessment-empty-title">
    <div class="workspace-sketch" aria-hidden="true">
      <svg viewBox="0 0 240 180" fill="none">
        <circle cx="120" cy="90" r="78" fill="var(--accent-soft)" />
        <g transform="rotate(-7 115 86)">
          <rect x="54" y="28" width="132" height="120" rx="7" fill="var(--ink)" />
          <rect x="49" y="23" width="132" height="120" rx="7" fill="white" stroke="var(--ink)" stroke-width="2" />
          <path d="M50 49h130" stroke="var(--ink)" stroke-width="2" />
          <circle cx="62" cy="36" r="2" fill="var(--ink)" />
          <circle cx="71" cy="36" r="2" fill="var(--ink)" />
          <rect x="65" y="66" width="14" height="14" rx="2" fill="var(--accent)" stroke="var(--ink)" />
          <path d="m68 72 3 3 5-6M91 72h65M91 98h49M91 121h59" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />
          <rect x="65" y="92" width="14" height="14" rx="2" stroke="var(--line)" stroke-width="2" />
          <rect x="65" y="115" width="14" height="14" rx="2" stroke="var(--line)" stroke-width="2" />
        </g>
        <circle cx="182" cy="133" r="25" fill="var(--accent)" stroke="var(--ink)" stroke-width="2" />
        <path d="m170 137 8-8m8 8 8-8m-15-7 7 7m-10 10 7 7M165 119l-4-4m38 34 4 4" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    </div>
    <p class="eyebrow">{{ copy.eyebrow }}</p>
    <h2 id="assessment-empty-title" class="empty-title">{{ title }}</h2>
    <p class="empty-description" :role="errorCode ? 'alert' : undefined">
      {{ !errorCode ? messages.assessment.emptyDescription : invalid ? copy.invalidDescription : copy.description }}
    </p>
    <ol v-if="errorCode && !invalid" class="recovery-steps">
      <li class="recovery-step">
        <span class="step-number" aria-hidden="true">1</span>
        <div><h3 class="step-title">{{ copy.restartTitle }}</h3><p>{{ copy.restartDescription }}</p></div>
      </li>
      <li class="recovery-step">
        <span class="step-number" aria-hidden="true">2</span>
        <div><h3 class="step-title">{{ copy.reloadTitle }}</h3><p>{{ copy.reloadDescription }}</p></div>
      </li>
    </ol>
    <button v-if="errorCode" type="button" class="primary-button reload-button" @click="reloadPage">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5M20 7v5l-4-4" /></svg>
      {{ copy.reload }}
    </button>
    <p class="empty-footer">{{ copy.footer }}</p>
  </section>
</template>

<style scoped>
.empty-state { max-width: 620px; margin: clamp(2rem, 7vh, 5rem) auto; padding: 0 1.5rem 2rem; text-align: center; }
.workspace-sketch { width: 220px; margin: 0 auto 1.5rem; }
.empty-title { margin: .75rem 0; font-size: clamp(1.75rem, 4vw, 2.5rem); line-height: 1.15; font-weight: 600; letter-spacing: -.045em; text-wrap: balance; }
.empty-description { max-width: 440px; margin: 0 auto; font-size: .9375rem; line-height: 1.7; color: var(--muted); text-wrap: pretty; }
.recovery-steps { margin: 2rem 0; padding: 1.5rem 0; border-block: 1px solid var(--line); list-style: none; display: grid; gap: 1.25rem; text-align: left; }
.recovery-step { display: flex; gap: 1rem; font-size: .875rem; line-height: 1.65; color: var(--muted); }
.step-number { display: grid; place-items: center; flex-shrink: 0; width: 26px; height: 26px; border: 1px solid var(--line); border-radius: 50%; font-family: ui-monospace, monospace; font-size: .75rem; color: var(--ink); }
.step-title { margin-bottom: .25rem; font-weight: 600; color: var(--ink); }
.reload-button { min-height: 44px; gap: .65rem; }
.reload-button:active { transform: scale(.98); }
.empty-footer { margin-top: 2rem; font-family: ui-monospace, monospace; font-size: .6875rem; color: var(--muted); }
@media (max-width: 480px) { .workspace-sketch { width: 170px; margin-bottom: 1rem; } .recovery-steps { margin: 1.5rem 0; } }
</style>
