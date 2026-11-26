import { makeScene2D, Rect, Txt, Line } from '@motion-canvas/2d';
import { waitFor } from '@motion-canvas/core';
import type { Explainer } from '@code-comprehension/quiz-contract';

export const presentation = { width: 1280, height: 480, fps: 30 };
export function createWalkthrough(data: Explainer) {
  return makeScene2D(function* (view) {
    view.fill('#fafbf7');
    for (const scene of data.scenes) {
      view.removeChildren();
      view.add(
        new Txt({
          text: scene.title,
          y: -180,
          fontSize: 32,
          fill: '#222321',
          width: 1160,
          textWrap: true,
        }),
      );
      const position = (id: string) =>
        (scene.nodes.findIndex((node) => node.id === id) -
          (scene.nodes.length - 1) / 2) *
        290;
      for (const edge of scene.edges) {
        view.add(
          new Line({
            points: [
              [position(edge.from), -35],
              [position(edge.to), -35],
            ],
            stroke: '#646760',
            lineWidth: 3,
            endArrow: true,
          }),
        );
      }
      const boxes = scene.nodes.map((node) => {
        const box = new Rect({
          x: position(node.id),
          y: -35,
          width: 250,
          height: 110,
          radius: 12,
          fill: '#edf2e5',
          stroke: '#d8d9d4',
          lineWidth: 2,
        });
        box.add(
          new Txt({
            text: node.label,
            fontSize: 25,
            width: 220,
            textWrap: true,
            fill: '#222321',
          }),
        );
        view.add(box);
        return box;
      });
      const caption = new Txt({
        y: 130,
        width: 1120,
        fontSize: 29,
        textWrap: true,
        fill: '#222321',
      });
      view.add(caption);
      for (const beat of scene.beats) {
        caption.text(beat.text);
        boxes.forEach((box, index) =>
          box.fill(
            beat.activeNodes.includes(scene.nodes[index]!.id)
              ? '#e3f86b'
              : '#edf2e5',
          ),
        );
        yield* waitFor(beat.durationSeconds);
      }
    }
  });
}
