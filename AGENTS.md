## Implementation and review standards

Before implementing or reviewing changes, read `CONTRIBUTING.md`. Apply code-quality
standards within the current ticket, including lean components and named lifecycle
operations; do not defer them to cleanup work.

### Branch naming

Use purpose-based branch prefixes such as `feat/`, `bugfix/`, `refactor/`,
`docs/`, or `chore/`, followed by a short kebab-case description. Use `feat/`
for new functionality. Do not prefix branch names with `codex/`.

### User-facing text

- Keep all application-owned user-facing text in message catalogs. Use the existing
  English catalog for browser copy and a dedicated catalog for CLI copy.
- This includes document titles, HTML entry points, visible text, accessible labels,
  placeholders, tooltips, validation messages, recovery guidance, CLI help, and
  terminal output. Check these surfaces as well as Vue templates.
- Source static HTML metadata from the same catalog during build or rendering;
  avoid a second hardcoded copy. Reuse shared product-name constants where applicable.
- Keep interpolation in catalog messages or formatters rather than assembling
  user-facing sentences in components, composables, or command handlers.
- Protocol values, state identifiers, paths, CSS classes, and diagnostics that never
  reach users may remain code literals. Errors printed or displayed to users count
  as user-facing text. Agent-generated quiz content remains assessment data.
- Before completing a change, inspect its templates, HTML, scripts, and output paths
  for user-facing literals and move any remaining copy into the appropriate catalog.
  English-only support is not an exemption; additional locales remain future work.

### Error contracts and constants

- Represent application failures with typed error codes defined once in the owning
  module or shared contract. Presentation code maps those codes to catalog messages;
  never branch on an error's prose. Keep diagnostic details separate from display copy.
- Define repeated or cross-boundary protocol and state identifiers in typed contracts
  or named constants. Preserve stable wire values independently of translated labels.
- Give meaningful numeric settings descriptive names with units, such as request
  timeouts and retry limits. Centralise shared values; keep single-owner constants
  beside the behaviour they control.
- Avoid unexplained literals, not all literals: self-explanatory values and standard
  syntax need no abstraction. Extract a constant when it communicates domain meaning,
  establishes a contract, or prevents conflicting copies.

## Agent skills

### Issue tracker
Track specs and tickets in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels
Use the configured triage role mappings. See `docs/agents/triage-labels.md`.

### Domain docs
Use a single-context layout. See `docs/agents/domain.md`.
