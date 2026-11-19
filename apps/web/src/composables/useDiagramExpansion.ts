import { nextTick, onScopeDispose, readonly, ref, type ShallowRef } from 'vue';

const motionQuery = '(prefers-reduced-motion: no-preference)';

export function useDiagramExpansion(
  dialog: Readonly<ShallowRef<HTMLDialogElement | null>>,
  trigger: Readonly<ShallowRef<HTMLButtonElement | null>>,
) {
  const expanded = ref(false);
  let active: ViewTransition | undefined;
  let revision = 0;
  let previousOverflow: string | undefined;

  function restoreScrolling() {
    if (previousOverflow === undefined) return;
    document.body.style.overflow = previousOverflow;
    previousOverflow = undefined;
  }

  async function changeExpanded(open: boolean, animate: boolean) {
    const operation = ++revision;
    active?.skipTransition();
    async function update() {
      if (operation !== revision || !dialog.value) return;
      expanded.value = open;
      await nextTick();
      if (operation !== revision || !dialog.value) return;
      if (open) {
        previousOverflow ??= document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (!dialog.value.open) dialog.value.showModal();
      } else {
        dialog.value.close();
        restoreScrolling();
        trigger.value?.focus({ preventScroll: true });
      }
    }
    if (!animate || !document.startViewTransition || !matchMedia(motionQuery).matches) {
      await update();
      return;
    }
    const transition = document.startViewTransition(update);
    active = transition;
    void transition.ready.catch(() => {});
    try { await transition.finished; }
    finally { if (active === transition) active = undefined; }
  }

  function expand(event: MouseEvent) { void changeExpanded(true, event.detail > 0); }
  function close(event?: MouseEvent) { void changeExpanded(false, (event?.detail ?? 0) > 0); }

  function dispose() {
    revision++;
    active?.skipTransition();
    dialog.value?.close();
    restoreScrolling();
  }
  onScopeDispose(dispose);
  return { expanded: readonly(expanded), expand, close };
}
