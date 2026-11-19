<script setup lang="ts">
import { useId, useTemplateRef } from 'vue';
import { messages } from '../locales/en';
import { useDiagramExpansion } from '../composables/useDiagramExpansion';

defineProps<{ url: string }>();
const id = useId();
const transitionName = `diagram-image-${id}`;
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const trigger = useTemplateRef<HTMLButtonElement>('trigger');
const { expanded, expand, close } = useDiagramExpansion(dialog, trigger);
</script>

<template>
  <div class="diagram-preview mt-3">
    <img :src="url" :alt="messages.diagram.title" class="diagram-image" :style="{ viewTransitionName: expanded ? 'none' : transitionName }" />
    <button
      ref="trigger" type="button" class="diagram-icon-button expand-button"
      :aria-label="messages.diagram.expand" :title="messages.diagram.expand"
      aria-haspopup="dialog" :aria-controls="id" :aria-expanded="expanded" @click="expand"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
      </svg>
    </button>
  </div>
  <Teleport to="body">
    <dialog :id="id" ref="dialog" :aria-label="messages.diagram.title" class="diagram-dialog" @cancel.prevent="close()">
      <div class="diagram-dialog-header">
        <h2 class="font-semibold">{{ messages.diagram.title }}</h2>
        <button type="button" autofocus class="diagram-icon-button" :aria-label="messages.diagram.close" :title="messages.diagram.close" @click="close">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <img :src="url" :alt="messages.diagram.title" class="expanded-diagram" :style="{ viewTransitionName: expanded ? transitionName : 'none' }" />
    </dialog>
  </Teleport>
</template>

<style scoped>
.diagram-preview { position: relative; padding-top: 2.75rem; }
.diagram-image { display: block; max-width: 100%; }
.diagram-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; flex-shrink: 0; cursor: pointer; border: 1px solid var(--line); border-radius: .25rem; background: var(--canvas); color: var(--ink); transition: background-color 150ms ease; }
.diagram-icon-button svg { width: 1.25rem; height: 1.25rem; }
.expand-button { position: absolute; top: 0; right: 0; }
.diagram-dialog { margin: auto; width: min(90vw, 80rem); max-width: calc(100vw - 2rem); max-height: calc(100dvh - 2rem); padding: clamp(1rem, 3vw, 2rem); border: 1px solid var(--line); border-radius: .5rem; background: var(--canvas); color: var(--ink); box-shadow: 0 1.5rem 5rem #0003; }
.diagram-dialog::backdrop { background: #0008; }
.diagram-dialog-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.expanded-diagram { display: block; width: 100%; max-height: calc(100dvh - 10rem); object-fit: contain; }
@media (hover: hover) and (pointer: fine) { .diagram-icon-button:hover { background: var(--surface); } }
@media (prefers-reduced-motion: reduce) { .diagram-icon-button { transition-duration: 100ms; } }
</style>
