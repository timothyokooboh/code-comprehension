import { makeScene2D, Rect, Txt, Line, Circle } from "@motion-canvas/2d";
import { all, createRef, waitFor, easeInOutCubic } from "@motion-canvas/core";
import content from "./content.json";
const palette = {
  background: "#151e22",
  ink: "#f5f3e8",
  muted: "#98a8ad",
  accent: "#d6ee86",
  panel: "#253237",
};
const positions = [-390, 0, 390];
const revealSeconds = 0.4;
export default makeScene2D(function* (view) {
  view.fill(palette.background);
  view.fontFamily("Arial, sans-serif");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const title = createRef<Txt>();
  const subtitle = createRef<Txt>();
  const counter = createRef<Txt>();
  const nodes = positions.map(() => createRef<Rect>());
  const lines = positions.map(() => createRef<Txt>());
  const marker = createRef<Circle>();
  view.add(
    <>
      <Txt
        ref={counter}
        x={-530}
        y={-310}
        fill={palette.accent}
        fontSize={18}
        fontFamily="monospace"
      />
      <Txt
        ref={title}
        y={-235}
        width={1120}
        textWrap
        fill={palette.ink}
        fontSize={42}
        fontWeight={500}
      />
      <Line
        points={[
          [-390, -90],
          [390, -90],
        ]}
        stroke={palette.muted}
        lineWidth={3}
        endArrow
      />
      {positions.map((x, index) => (
        <Rect
          ref={nodes[index]}
          x={x}
          y={-90}
          width={290}
          height={90}
          radius={14}
          fill={palette.panel}
          stroke={palette.muted}
          lineWidth={2}
        >
          <Txt text={content.nodes[index]} fill={palette.ink} fontSize={28} />
        </Rect>
      ))}
      <Circle ref={marker} x={-390} y={-20} size={10} fill={palette.accent} />
      {lines.map((line, index) => (
        <Txt
          ref={line}
          y={65 + index * 62}
          width={1080}
          textWrap
          fill={palette.ink}
          fontSize={29}
        />
      ))}
      <Txt
        ref={subtitle}
        y={290}
        width={1100}
        textWrap
        fill={palette.muted}
        fontSize={22}
      />
    </>,
  );
  for (const [index, chapter] of content.chapters.entries()) {
    const beatSeconds = chapter.duration / chapter.lines.length;
    counter().text(
      `${String(index + 1).padStart(2, "0")} / ${String(content.chapters.length).padStart(2, "0")}`,
    );
    title().text(chapter.title);
    subtitle().text(chapter.subtitle);
    lines.forEach((line, n) => {
      line().text(chapter.lines[n]);
      line().opacity(n === 0 ? 1 : 0);
    });
    const transitionSeconds = reduceMotion || index === 0 ? 0 : revealSeconds;
    yield* all(
      marker().position.x(
        positions[chapter.active],
        transitionSeconds,
        easeInOutCubic,
      ),
      ...nodes.map((node, n) =>
        node().stroke(
          n === chapter.active ? palette.accent : palette.muted,
          transitionSeconds,
        ),
      ),
    );
    yield* waitFor(beatSeconds - transitionSeconds);
    for (let step = 1; step < lines.length; step++) {
      const duration = reduceMotion ? 0 : revealSeconds;
      yield* lines[step]().opacity(1, duration);
      yield* waitFor(beatSeconds - duration);
    }
  }
});
