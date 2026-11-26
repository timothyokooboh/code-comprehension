import {
  bootstrap,
  MetaFile,
  ValueDispatcher,
  Player,
  Stage,
  Vector2,
  LogLevel,
  type LogPayload,
  type FullSceneDescription,
} from '@motion-canvas/core';
import type { Explainer } from '@code-comprehension/quiz-contract';
import { createWalkthrough, presentation } from './scene';

type Events = {
  ready: () => void;
  failed: () => void;
  frame: (seconds: number) => void;
  playing: (value: boolean) => void;
};
export function mountPlayer(
  container: HTMLElement,
  data: Explainer,
  events: Events,
) {
  const scene = createWalkthrough(data);
  // Match Motion Canvas's compiled scene wrapper; Player supplies runtime fields.
  const description = {
    ...scene,
    name: data.id,
    onReplaced: new ValueDispatcher(scene.config),
  } as unknown as FullSceneDescription;
  const project = bootstrap(
    data.id,
    { core: '3.17.2', two: '3.17.2', ui: null, vitePlugin: null },
    [],
    { scenes: [description] },
    new MetaFile(data.id, false),
    new MetaFile('settings', false),
  );
  const size = new Vector2(presentation.width, presentation.height);
  const stage = new Stage();
  stage.configure({ size, resolutionScale: 1, background: '#fafbf7' });
  container.append(stage.finalBuffer);
  const player = new Player(
    project,
    { size, fps: presentation.fps },
    { paused: true, loop: false, muted: true },
  );
  let disposed = false;
  let failed = false;
  const loadingTimeoutMs = 15_000;
  const timer = window.setTimeout(fail, loadingTimeoutMs);
  function fail() {
    if (!disposed && !failed) {
      failed = true;
      clearTimeout(timer);
      player.togglePlayback(false);
      player.deactivate();
      events.failed();
    }
  }
  function logged(event: LogPayload) {
    if (event.level === LogLevel.Error) fail();
  }
  project.logger.onLogged.subscribe(logged);
  function ready() {
    clearTimeout(timer);
    if (!disposed && !failed) events.ready();
  }
  async function render() {
    try {
      if (!disposed)
        await stage.render(
          player.playback.currentScene,
          player.playback.previousScene,
        );
    } catch {
      fail();
    }
  }
  function frame(value: number) {
    events.frame(value / presentation.fps);
  }
  function state(value: { paused: boolean }) {
    events.playing(!value.paused);
  }
  player.onRender.subscribe(render);
  player.onFrameChanged.subscribe(frame);
  player.onStateChanged.subscribe(state);
  player.onRecalculated.subscribe(ready);
  return {
    toggle: () => player.togglePlayback(),
    replay: () => {
      player.requestSeek(0);
      player.togglePlayback(true);
    },
    seek: (seconds: number) =>
      player.requestSeek(Math.round(seconds * presentation.fps)),
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      player.togglePlayback(false);
      player.deactivate();
      player.onRender.unsubscribe(render);
      player.onFrameChanged.unsubscribe(frame);
      player.onStateChanged.unsubscribe(state);
      player.onRecalculated.unsubscribe(ready);
      project.logger.onLogged.unsubscribe(logged);
      stage.finalBuffer.remove();
    },
  };
}
