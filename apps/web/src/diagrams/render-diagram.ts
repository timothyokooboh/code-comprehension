export const diagramErrorCodes = { renderFailed: 'diagram_render_failed' } as const;
export type DiagramErrorCode = typeof diagramErrorCodes[keyof typeof diagramErrorCodes];

export class DiagramError extends Error {
  readonly code = diagramErrorCodes.renderFailed;
}

async function loadRenderer() {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    // SVG images cannot display foreignObject labels; diagram directives must not enable them.
    secure: [...(mermaid.mermaidAPI.defaultConfig.secure ?? []), 'htmlLabels'],
    layout: 'dagre',
    suppressErrorRendering: true,
  });
  return mermaid;
}

let renderer: ReturnType<typeof loadRenderer> | undefined;

export async function renderDiagram(source: string): Promise<string> {
  const container = document.createElement('div');
  container.className = 'diagram-render-surface';
  container.setAttribute('aria-hidden', 'true');
  document.body.append(container);
  try {
    renderer ??= loadRenderer();
    const mermaid = await renderer;
    const { svg } = await mermaid.render(`diagram-${crypto.randomUUID()}`, source, container);
    return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  } catch (cause) {
    throw new DiagramError(diagramErrorCodes.renderFailed, { cause });
  } finally {
    container.remove();
  }
}
