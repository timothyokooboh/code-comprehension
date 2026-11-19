import { onMounted, onScopeDispose, readonly, ref } from 'vue';
import { renderDiagram, diagramErrorCodes, type DiagramErrorCode } from '../diagrams/render-diagram';

export const diagramStates = { loading: 'loading', ready: 'ready', failed: 'failed' } as const;
type DiagramState =
  | { status: typeof diagramStates.loading }
  | { status: typeof diagramStates.ready; url: string }
  | { status: typeof diagramStates.failed; errorCode: DiagramErrorCode };

export function useDiagram(source: string) {
  const state = ref<DiagramState>({ status: diagramStates.loading });
  let disposed = false;
  let imageUrl: string | undefined;

  async function render() {
    try {
      const url = await renderDiagram(source);
      if (disposed) {
        URL.revokeObjectURL(url);
        return;
      }
      imageUrl = url;
      state.value = { status: diagramStates.ready, url };
    } catch {
      if (!disposed) state.value = { status: diagramStates.failed, errorCode: diagramErrorCodes.renderFailed };
    }
  }

  function dispose() {
    disposed = true;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }

  onMounted(render);
  onScopeDispose(dispose);
  return { state: readonly(state) };
}
