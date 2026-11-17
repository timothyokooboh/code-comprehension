# Code quality

Apply these standards in each implementation ticket and review; do not defer them
to a cleanup ticket.

- Keep functions, components, and scripts focused on one responsibility. Extract
  substantial work behind an interface that hides its implementation, rather than
  moving a large block unchanged or creating forwarding-only wrappers.
- Let root Vue components compose the screen. Keep request mechanics in API
  modules and lifecycle-owned reactive workflows in focused composables.
- Lifecycle hooks should register named operations (for example, `onMounted(connect)`)
  rather than contain request, validation, state, and presentation logic inline.
- Represent connection/workflow state independently from its display text. Derive
  messages and accessibility roles from that state; avoid redundant state flags.
- Use `ref` for ordinary primitive state. Use `shallowRef` when shallow semantics
  are intentional, such as opaque instances or large immutable structures.
- Keep browser-facing copy, including accessible labels and recovery guidance, in
  the English message catalog. Protocol values, state identifiers, URLs, and
  internal diagnostic messages are code, not translations. Additional locales and
  generated-question language support require an explicit product decision.
- Own cancellation and cleanup beside the asynchronous workflow that creates it.
- Test observable behaviour through the agreed public boundaries. Preserve the
  success and failure cases when restructuring implementation.
