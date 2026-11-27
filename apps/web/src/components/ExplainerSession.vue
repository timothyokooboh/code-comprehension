<script setup lang="ts">
import { explainerStates } from '../explainer/state';
import { useExplainer } from '../explainer/useExplainer';
import { explainerMessages as copy } from '../locales/explainer.en';
import ExplainerPlayer from './ExplainerPlayer.vue';
import QuestionDiagram from './QuestionDiagram.vue';
import PrComparison from './PrComparison.vue';
const { data, status, load } = useExplainer();
</script>
<template>
  <article class="walkthrough">
    <p v-if="status === explainerStates.loading" role="status">
      {{ copy.loading }}
    </p>
    <div v-else-if="status === explainerStates.failed" role="alert">
      {{ copy.failed }} <button @click="load">{{ copy.retry }}</button>
    </div>
    <template v-else-if="data">
      <header>
        <p class="scope" :title="data.scope.join(' · ')">
          {{ data.scope.join(' · ') }}
        </p>
        <h2>{{ data.title }}</h2>
      </header>
      <ExplainerPlayer :data="data" />
      <section class="reading">
        <h2>{{ copy.companion }}</h2>
        <p v-for="paragraph in data.companion.paragraphs" :key="paragraph">
          {{ paragraph }}
        </p>
        <QuestionDiagram
          v-if="data.companion.diagram"
          :source="data.companion.diagram.source"
        />
        <ul>
          <li
            v-for="reference in data.companion.references"
            :key="reference.path"
          >
            <code>{{ copy.reference(reference.path, reference.line) }}</code>
          </li>
        </ul>
        <PrComparison v-if="data.comparison" :comparison="data.comparison" />
        <div class="sr-only">
          <h2>{{ copy.transcript }}</h2>
          <section v-for="scene in data.scenes" :key="scene.id">
            <h3>{{ scene.title }}</h3>
            <ul>
              <li v-for="node in scene.nodes" :key="node.id">
                {{ node.label }}
              </li>
            </ul>
            <ul>
              <li v-for="edge in scene.edges" :key="`${edge.from}-${edge.to}`">
                {{
                  copy.connection(
                    scene.nodes.find((node) => node.id === edge.from)!.label,
                    scene.nodes.find((node) => node.id === edge.to)!.label,
                  )
                }}
              </li>
            </ul>
            <p v-for="beat in scene.beats" :key="beat.text">{{ beat.text }}</p>
            <ul>
              <li v-for="reference in scene.references" :key="reference.path">
                <code>{{
                  copy.reference(reference.path, reference.line)
                }}</code>
              </li>
            </ul>
          </section>
        </div>
      </section>
    </template>
  </article>
</template>
<style scoped>
.walkthrough {
  max-width: 1120px;
  padding: 24px;
  margin-inline: auto;
}
.scope {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
header {
  margin-bottom: 20px;
}
h2 {
  font-size: 1.6rem;
  font-weight: 550;
  margin-block: 8px 16px;
}
h3 {
  font-size: 1.15rem;
  font-weight: 550;
  margin-block: 24px 12px;
}
.reading {
  max-width: 800px;
  margin: 40px auto;
  line-height: 1.7;
}
p {
  margin-bottom: 12px;
}
code {
  overflow-wrap: anywhere;
}
</style>
