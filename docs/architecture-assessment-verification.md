# Architecture assessment grounding check

For #38, a small mixed assessment was authored against this repository and checked
against the implementation. It was validated through `--validate-product` with
`kind: general` and `focus: system_architecture_v1`. No learner session or cache
was created. This is a content review, not a claim that automated tests can prove
agent-generated explanations correct.

## Reviewed questions

1. **An agent produces structurally valid quiz data with an inaccurate explanation.
   Which architectural boundary is responsible for catching the factual mistake?**
   - A: The CLI schema compares each explanation with its referenced source.
   - B: The coding agent checks meaning against source; the CLI validates structure.
   - C: The browser checks meaning while comparing selected option identifiers.
   - Correct: B. The CLI performs schema parsing; it does not run a model or inspect
     explanation semantics. The generation workflow owns evidence checks.
   - Evidence: [quiz loading](../packages/cli/src/load-quiz.ts),
     [generation workflow](../skills/product-quiz/SKILL.md).

2. **A browser has submitted written answers, but its reviewer disconnects. Which
   component can produce new code-grounded feedback?**
   - A: The runtime evaluates the stored reference answer after its lease expires.
   - B: The browser compares the response with the explanation already in the quiz.
   - C: A reconnected coding agent retrieves the review job and submits feedback.
   - Correct: C. Runtime coordination and validation do not replace the reasoning
     supplied by the active agent.
   - Evidence: [review lifecycle](../packages/cli/src/written-review/state.ts),
     [review workflow](../skills/pr-quiz/references/written-review.md).

3. **Why must a late written review be rejected after a retake, even if the new
   sitting includes the same questions?** (Written response.)
   - Essential reasoning: the learner's answers belong to a particular attempt;
     question identity alone does not identify those answers. Retakes change the
     attempt and clear the previous submission. Feedback validation checks the
     current submission identities and lease before accepting a result.
   - Evidence: [review state and retake](../packages/cli/src/written-review/state.ts).

These questions assess generation/validation, browser/runtime/agent coordination,
and ownership across an attempt boundary. They are deliberately authored from
those architectural relationships, not sampled from unrelated module banks.
All alternatives are plausible responsibility assignments; their correctness is
resolved by the code. The short example does not claim exhaustive coverage.
