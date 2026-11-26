<script setup lang="ts">
import Walkthrough from "./Walkthrough.vue";
import { messages } from "./messages";
import content from "./content.json";
const references = [
  ...new Set(content.chapters.flatMap((chapter) => chapter.references)),
];
const sourceBase =
  "https://github.com/timothyokooboh/code-comprehension/blob/1505b3d4a88de505f36daedf29637e80f65f7335/";
</script>
<template>
  <header>
    <strong>{{ messages.brand }}</strong
    ><span>{{ messages.label }}</span>
  </header>
  <main>
    <div class="intro">
      <p class="eyebrow">{{ messages.scope }}</p>
      <h1>{{ content.title }}</h1>
      <p>{{ content.subtitle }}</p>
    </div>
    <Walkthrough />
    <div class="reading">
      <article>
        <h2>{{ messages.read }}</h2>
        <p v-for="paragraph in messages.explanation" :key="paragraph">
          {{ paragraph }}
        </p>
        <div class="diagram" :aria-label="messages.diagram">
          <template v-for="(node, index) in content.nodes" :key="node"
            ><span v-if="index" aria-hidden="true">↔</span
            ><strong>{{ node }}</strong></template
          >
        </div>
        <details>
          <summary>{{ messages.transcript }}</summary>
          <section v-for="chapter in content.chapters" :key="chapter.title">
            <h3>{{ chapter.title }}</h3>
            <p v-for="line in chapter.lines" :key="line">{{ line }}</p>
          </section>
        </details>
      </article>
      <aside>
        <h2>{{ messages.evidence }}</h2>
        <a
          v-for="path in references"
          :key="path"
          :href="sourceBase + path"
          target="_blank"
          rel="noreferrer"
          >{{ path }}</a
        >
        <p>{{ messages.snapshot }}</p>
      </aside>
    </div>
    <footer>{{ messages.note }}</footer>
  </main>
</template>
