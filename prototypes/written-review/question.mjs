export const assessment = [
  {
    id: 'count', type: 'single',
    prompt: 'Three modules are selected, with distinct questions in each. The engineer requests two questions. How many questions does the sitting contain?',
    options: [{ id: 'two', text: 'Two; at least one module is absent from this sitting.' }, { id: 'three', text: 'Three; coverage adds one slot for each module.' }, { id: 'reject', text: 'None; the count must cover every selected module.' }],
    correctOptionIds: ['two'], explanation: 'The requested count is a strict cap. Sampling reserves module coverage only while slots remain.',
    references: ['packages/quiz-contract/src/selection.ts'],
  },
  {
    id: 'refresh', type: 'multiple',
    prompt: 'An unchanged, valid product bank is checked with --refresh. Which outcomes follow?',
    options: [{ id: 'generate', text: 'The check requests generation of a replacement.' }, { id: 'retain', text: 'The check requests a retention receipt for the existing questions.' }, { id: 'keep', text: 'The existing bank file remains until a replacement is saved.' }, { id: 'delete', text: 'The existing bank file is removed before generation starts.' }],
    correctOptionIds: ['generate', 'keep'], explanation: 'Explicit refresh returns generation-required before reuse checks. It does not delete the saved bank.',
    references: ['packages/cli/src/product/cache.ts'],
  },
  {
    id: 'replacement-attempt', type: 'written',
    prompt: 'An engineer submits a product quiz. Their agent explicitly replaces the assessment with identical questions. What happens in the open browser, and after reload? Explain why.',
    rubric: ['The open browser keeps its attempt; replacement does not push a reset.', 'Reload starts a fresh unanswered attempt.', 'Explicit replacement changes attemptRevision, which participates in persistence identity; runtimeRevision is excluded.'],
    references: ['packages/cli/src/assessment/state.ts', 'apps/web/src/storage/quiz-attempt.ts', 'apps/web/src/composables/useQuizLoader.ts'],
  },
  {
    id: 'source-review', type: 'written',
    prompt: 'A comment is inserted above code cited by a cached product question. Behaviour is unchanged. Why does the bank still require review, and what should the agent do before reusing it?',
    rubric: ['Content hashes detect the edit but do not establish semantic equivalence.', 'The agent checks questions, answers, explanations and evidence against changed source, including shifted line references.', 'If still valid, explicitly retain using the current review token and reference corrections; otherwise regenerate. Fingerprints are not silently refreshed.'],
    references: ['packages/cli/src/product/cache.ts', 'packages/cli/src/product/review.ts', 'skills/product-quiz/references/source-review.md'],
  },
];
