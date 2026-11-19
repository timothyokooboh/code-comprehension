# UI SDK evaluation for the MCQ interface

Evaluated on 2026-11-19 for ticket #3.

UI SDK documents Vue support and composable selection/focus behaviours. The
published `@ui-sdk/vue` package inspected was `0.1.0-beta.10`, with radio,
checkbox, field, and button exports. This evaluation is based on documentation
and package metadata, not a production integration or performance benchmark.

For this ticket, use native radio and checkbox inputs, fieldsets, legends, and
buttons. They supply the keyboard and form semantics needed by the two question
types, while Vue owns selected answers. Adding an additional behaviour layer
would introduce beta API maintenance without a required interaction benefit.
No UI SDK dependency is adopted in this slice.

Revisit for a concrete interaction that benefits from its composed behaviours,
such as complex focus management or popups. If adopted, pin the evaluated version
and test its keyboard behaviour through the browser interface.

Sources:
- https://ui-sdk.dev/docs
- https://ui-sdk.dev/docs/core/behaviors/selection
- Published metadata: `npm view @ui-sdk/vue version exports --json`
