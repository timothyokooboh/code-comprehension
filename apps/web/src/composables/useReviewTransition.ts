import { nextTick, onScopeDispose } from 'vue';

const reviewLayoutQuery = '(min-width: 1280px) and (prefers-reduced-motion: no-preference)';

export function useReviewTransition() {
  let active: ViewTransition | undefined;

  async function updateReview(update: () => void, animate: boolean) {
    active?.skipTransition();
    if (!animate || !document.startViewTransition || !matchMedia(reviewLayoutQuery).matches) {
      update();
      await nextTick();
      return;
    }
    const transition = document.startViewTransition(async () => {
      update();
      await nextTick();
    });
    active = transition;
    // A skipped snapshot must never prevent the underlying assessment update.
    void transition.ready.catch(() => {});
    try {
      await transition.finished;
    } finally {
      if (active === transition) active = undefined;
    }
  }

  onScopeDispose(() => active?.skipTransition());
  return { updateReview };
}
