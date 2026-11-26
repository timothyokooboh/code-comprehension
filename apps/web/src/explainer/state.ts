export const explainerStates = {
  loading: 'loading',
  ready: 'ready',
  failed: 'failed',
} as const;
export type ExplainerState =
  (typeof explainerStates)[keyof typeof explainerStates];
