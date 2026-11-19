# Shared question-generation guidance

This guidance applies to PR and product assessment content. A PR quiz asks what
changed; a product quiz asks how the current system works. Ground both in current
code and attach repository-relative source paths, with line numbers when useful.

Ask for predictions, consequences, failure scenarios, or relationships. Distractors
should represent plausible misunderstandings, not trick wording or filename recall.
Every correct option must be supported by the evidence. For multiple-answer questions,
use at least two correct options; missing any correct option or selecting an incorrect
one earns no credit. Do not make questions ambiguous to manufacture difficulty.

## Explanations

- `concise`: the answer and its key reason.
- `detailed`: a short paragraph, typically 2–4 sentences, adding useful context about
  how the behaviour works and why the choice matters. Include a trade-off, consequence,
  or failure scenario when helpful. Do not force every category or paraphrase the
  concise version. Do not invent rationale or implementation details.

Example, only when supported by the repository:

**Concise:** Reuse the idempotency key to prevent duplicate payments.

**Detailed:** A timeout does not mean the provider rejected the payment; it may have
processed it before the response was lost. Reusing the same key lets the provider
recognise the retry. A new key could create a second payment.

Before validation, review each pair: does the detailed text add a causal explanation
or useful context the concise text lacks? Is that extra context supported by the cited
code? Remove filler rather than meeting a word quota. Structural validation cannot
establish factual correctness or explanation quality.

Use diagrams only when they clarify an actual relationship or flow. Optional Mermaid
source should be small, readable, and based on the same evidence. Explain unsupported
or uncertain behaviour instead of inventing an answer, test result, assumption, or
future PR. Distinguish tests you read from tests actually executed.
