export const walkthrough = {
  schemaVersion: 1,
  id: 'narration-demo',
  type: 'product',
  title: 'From code to understanding',
  scope: ['General system architecture'],
  snapshot: {
    revision: 'prototype',
    capturedAt: '2026-11-27T00:00:00Z',
    includesUncommitted: false,
  },
  scenes: [
    {
      id: 'agent',
      title: 'Your agent supplies the understanding',
      nodes: [
        { id: 'code', label: 'Source code' },
        { id: 'agent', label: 'Your coding agent' },
        { id: 'content', label: 'Grounded explanation' },
      ],
      edges: [
        { from: 'code', to: 'agent' },
        { from: 'agent', to: 'content' },
      ],
      beats: [
        {
          text: 'The agent reads implementation and tests before writing an explanation.',
          durationSeconds: 5,
          activeNodes: ['code', 'agent'],
        },
        {
          text: 'Its explanation cites the code, and distinguishes evidence from assumptions.',
          durationSeconds: 5,
          activeNodes: ['content'],
        },
      ],
      references: [{ path: 'skills/product-explainer/SKILL.md' }],
    },
    {
      id: 'runtime',
      title: 'The runtime checks and presents the content',
      nodes: [
        { id: 'data', label: 'Structured content' },
        { id: 'validation', label: 'Validation' },
        { id: 'browser', label: 'Local browser' },
      ],
      edges: [
        { from: 'data', to: 'validation' },
        { from: 'validation', to: 'browser' },
      ],
      beats: [
        {
          text: 'The runtime checks structure and prepared evidence before opening the walkthrough.',
          durationSeconds: 5,
          activeNodes: ['data', 'validation'],
        },
        {
          text: 'The browser displays diagrams and reading beats. Narration can speak those same beats.',
          durationSeconds: 5,
          activeNodes: ['browser'],
        },
      ],
      references: [
        { path: 'packages/cli/src/explainer/product/load.ts' },
        { path: 'apps/web/src/explainer/scene.ts' },
      ],
    },
    {
      id: 'practice',
      title: 'Learning and assessment remain independent',
      nodes: [
        { id: 'learn', label: 'Learn with an explainer' },
        { id: 'practice', label: 'Request a quiz' },
      ],
      edges: [{ from: 'learn', to: 'practice' }],
      beats: [
        {
          text: 'After learning, you can request a quiz to test your reasoning. It never starts automatically.',
          durationSeconds: 6,
          activeNodes: ['learn', 'practice'],
        },
      ],
      references: [{ path: 'skills/product-explainer/SKILL.md' }],
    },
  ],
  companion: {
    paragraphs: [
      'This prototype speaks the reading beats using installed local browser voices.',
    ],
    references: [{ path: 'skills/product-explainer/SKILL.md' }],
  },
};
