import { onMounted, onBeforeUnmount, ref, type Ref } from "vue";
import { Player, Stage, Vector2 } from "@motion-canvas/core";
import project from "./project?project";
const framesPerSecond = 30;
export function useWalkthrough(container: Ref<HTMLElement | null>) {
  const ready = ref(false),
    failed = ref(false),
    playing = ref(false),
    seconds = ref(0);
  let player: Player | undefined;
  const stage = new Stage();
  async function render() {
    if (player)
      await stage.render(
        player.playback.currentScene,
        player.playback.previousScene,
      );
  }
  function updateFrame(frame: number) {
    seconds.value = frame / framesPerSecond;
  }
  function updateState(state: { paused: boolean }) {
    playing.value = !state.paused;
  }
  function markReady() {
    ready.value = true;
  }
  function connect() {
    try {
      stage.configure({
        size: new Vector2(1280, 720),
        resolutionScale: 1,
        background: "#151e22",
      });
      container.value?.append(stage.finalBuffer);
      player = new Player(
        project,
        { size: new Vector2(1280, 720), fps: framesPerSecond },
        { paused: true, muted: false, loop: false },
      );
      player.onRender.subscribe(render);
      player.onFrameChanged.subscribe(updateFrame);
      player.onStateChanged.subscribe(updateState);
      player.onRecalculated.subscribe(markReady);
    } catch {
      failed.value = true;
    }
  }
  function seek(time: number) {
    player?.requestSeek(Math.round(time * framesPerSecond));
  }
  function toggle() {
    player?.togglePlayback();
  }
  function disconnect() {
    player?.togglePlayback(false);
    player?.deactivate();
    player?.onRender.unsubscribe(render);
    player?.onFrameChanged.unsubscribe(updateFrame);
    player?.onStateChanged.unsubscribe(updateState);
    player?.onRecalculated.unsubscribe(markReady);
    stage.finalBuffer.remove();
  }
  onMounted(connect);
  onBeforeUnmount(disconnect);
  return { ready, failed, playing, seconds, seek, toggle };
}
