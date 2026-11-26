import { explainerStates, type ExplainerState } from './state';
import { onMounted, onBeforeUnmount, ref, type Ref } from 'vue';
import type { Explainer } from '@code-comprehension/quiz-contract';
import type { mountPlayer } from './player';
export function usePlayer(container: Ref<HTMLElement | null>, data: Explainer) {
  const status = ref<ExplainerState>(explainerStates.loading);
  const seconds = ref(0);
  const playing = ref(false);
  let player: ReturnType<typeof mountPlayer> | undefined;
  let generation = 0;
  function disconnect() {
    generation++;
    player?.dispose();
    player = undefined;
  }
  async function connect() {
    disconnect();
    const current = generation;
    status.value = explainerStates.loading;
    try {
      const { mountPlayer } = await import('./player');
      if (current !== generation || !container.value) return;
      player = mountPlayer(container.value, data, {
        ready: () => {
          if (current === generation) status.value = explainerStates.ready;
        },
        failed: () => {
          if (current !== generation) return;
          disconnect();
          status.value = explainerStates.failed;
        },
        frame: (value) => {
          if (current === generation) seconds.value = value;
        },
        playing: (value) => {
          if (current === generation) playing.value = value;
        },
      });
    } catch {
      if (current === generation) status.value = explainerStates.failed;
    }
  }
  function seek(seconds: number) {
    player?.seek(seconds);
  }
  function toggle() {
    player?.toggle();
  }
  function replay() {
    player?.replay();
  }
  onMounted(connect);
  onBeforeUnmount(disconnect);
  return { status, seconds, playing, seek, toggle, replay, connect };
}
