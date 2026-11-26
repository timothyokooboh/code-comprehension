import { z } from 'zod';
import { assessmentTypes } from './quiz.ts';
import { prComparisonSchema } from './pr.ts';

export const explainerPath = '/api/explainer';
export const explainerRoute = '/explainer';
export const explainerLimits = {
  durationSeconds: 180,
  companionWords: 500,
  inputBytes: 256 * 1024,
  scenes: 24,
  beats: 3,
  nodes: 4,
  edges: 6,
} as const;
export const explainerIssueCodes = {
  duration: 'explainer_duration',
  words: 'explainer_words',
  reference: 'explainer_reference',
  comparison: 'explainer_comparison',
} as const;
const text = z.string().trim().min(1);
const identifier = text.max(64).regex(/^[a-zA-Z0-9_-]+$/);
const reference = z.strictObject({
  path: text
    .max(512)
    .regex(/^(?!\/|[A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/),
  line: z.number().int().positive().optional(),
});
const references = z.array(reference).min(1).max(32);
const sceneSchema = z.strictObject({
  id: identifier,
  title: text.max(80),
  nodes: z
    .array(z.strictObject({ id: identifier, label: text.max(36) }))
    .min(1)
    .max(explainerLimits.nodes),
  edges: z
    .array(z.strictObject({ from: identifier, to: identifier }))
    .max(explainerLimits.edges),
  beats: z
    .array(
      z.strictObject({
        text: text.max(120),
        durationSeconds: z.number().min(2).max(30),
        activeNodes: z.array(identifier).max(explainerLimits.nodes),
      }),
    )
    .min(1)
    .max(explainerLimits.beats),
  references,
});
function sceneDuration(scene: z.infer<typeof sceneSchema>) {
  return scene.beats.reduce((total, beat) => total + beat.durationSeconds, 0);
}

export const explainerSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: identifier,
    type: z.enum(assessmentTypes),
    title: text.max(120),
    scope: z.array(text.max(120)).min(1).max(12),
    snapshot: z.strictObject({
      revision: text.max(128),
      capturedAt: z.iso.datetime({ offset: true }),
      includesUncommitted: z.boolean(),
    }),
    comparison: prComparisonSchema.optional(),
    scenes: z.array(sceneSchema).min(1).max(explainerLimits.scenes),
    companion: z.strictObject({
      paragraphs: z.array(text.max(6000)).min(1).max(12),
      references,
      diagram: z
        .strictObject({ format: z.literal('mermaid'), source: text.max(8000) })
        .optional(),
    }),
  })
  .superRefine((value, context) => {
    const issue = (path: (string | number)[], reason: string) =>
      context.addIssue({ code: 'custom', path, params: { reason } });
    if (
      value.scenes.reduce((sum, scene) => sum + sceneDuration(scene), 0) >
      explainerLimits.durationSeconds
    )
      issue(['scenes'], explainerIssueCodes.duration);
    const words = value.companion.paragraphs
      .join(' ')
      .split(/\s+/u)
      .filter(Boolean).length;
    if (words > explainerLimits.companionWords)
      issue(['companion', 'paragraphs'], explainerIssueCodes.words);
    if (
      (value.type === assessmentTypes.pr) !== Boolean(value.comparison) ||
      (value.comparison &&
        (value.comparison.head !== value.snapshot.revision ||
          value.comparison.includesUncommitted !==
            value.snapshot.includesUncommitted))
    )
      issue(['comparison'], explainerIssueCodes.comparison);
    const ids = new Set<string>();
    value.scenes.forEach((scene, index) => {
      if (ids.has(scene.id))
        issue(['scenes', index, 'id'], explainerIssueCodes.reference);
      ids.add(scene.id);
      const nodes = new Set(scene.nodes.map((node) => node.id));
      if (nodes.size !== scene.nodes.length)
        issue(['scenes', index, 'nodes'], explainerIssueCodes.reference);
      if (
        scene.edges.some(
          (edge) =>
            !nodes.has(edge.from) ||
            !nodes.has(edge.to) ||
            edge.from === edge.to,
        )
      )
        issue(['scenes', index, 'edges'], explainerIssueCodes.reference);
      scene.beats.forEach((beat, beatIndex) => {
        if (
          beat.activeNodes.some((id) => !nodes.has(id)) ||
          new Set(beat.activeNodes).size !== beat.activeNodes.length
        )
          issue(
            ['scenes', index, 'beats', beatIndex, 'activeNodes'],
            explainerIssueCodes.reference,
          );
      });
    });
  });
export type Explainer = z.infer<typeof explainerSchema>;
export type ExplainerScene = Explainer['scenes'][number];
export function explainerDuration(explainer: Explainer) {
  return explainer.scenes.reduce(
    (total, scene) => total + sceneDuration(scene),
    0,
  );
}
export function explainerChapters(explainer: Explainer) {
  let start = 0;
  return explainer.scenes.map((scene) => {
    const chapter = { scene, start };
    start += sceneDuration(scene);
    return chapter;
  });
}
