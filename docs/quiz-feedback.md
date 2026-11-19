# Quiz feedback

Explanations appear only after submission. Each question owns its concise/detailed
control, keyed by the question ID. Retaking unmounts feedback and returns the next
attempt to concise mode. Reference locations are plain, selectable repository-relative
paths with optional line numbers; they do not invoke an editor or read repository files.

Mermaid 12.3.0 is pinned and loaded dynamically only when submitted feedback includes
a diagram. The compiled package includes its assets, so rendering does not use a CDN
or send quiz data elsewhere. The renderer uses strict security, disables HTML labels,
and displays the resulting SVG through a blob-backed image rather than injecting it
into the application's DOM. Blob URLs are revoked when feedback is removed, including
when rendering finishes after a retake. Source text is available in a native disclosure;
render errors leave the explanation and references usable.

The full Mermaid distribution adds optional chunks to the packaged UI, including large
layout engines. Those chunks are loaded on demand; the default layout is Dagre.

Implementation follows the [Mermaid usage API](https://mermaid.js.org/config/usage.html).

Rendered diagrams have an expand icon opening a native modal dialog, with a close
icon and Escape dismissal. The viewer reuses the same safe image URL, restores focus
to the trigger, and restores page scrolling when closed or removed. Pointer opening
and closing use the existing 240ms View Transition timing; keyboard activation,
reduced motion, and browsers without that API update directly. The dialog remains
usable without animation and fits the viewport.
