<script setup lang="ts">
import { useDiagram, diagramStates } from '../composables/useDiagram';
import DiagramViewer from './DiagramViewer.vue';
import { messages } from '../locales/en';

const props = defineProps<{ source: string }>();
const { state } = useDiagram(props.source);
</script>

<template>
  <figure class="mt-5">
    <figcaption class="font-semibold">{{ messages.diagram.title }}</figcaption>
    <p v-if="state.status === diagramStates.loading" role="status" class="mt-2 text-sm text-slate-600">{{ messages.diagram.loading }}</p>
    <DiagramViewer v-else-if="state.status === diagramStates.ready" :url="state.url" />
    <p v-else role="status" class="mt-2 text-sm text-slate-600">{{ messages.diagram.errors[state.errorCode] }}</p>
    <details class="mt-3">
      <summary class="cursor-pointer rounded text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">{{ messages.diagram.source }}</summary>
      <pre class="mt-2 overflow-x-auto rounded bg-slate-50 p-3 text-sm"><code>{{ source }}</code></pre>
    </details>
  </figure>
</template>
