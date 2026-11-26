export const applicationName = 'Code Comprehension';
export const runtimeLoopbackHost = '127.0.0.1';
export const runtimeStatusPath = '/api/status';
export const runtimeReadyStatus = 'ready';

export interface RuntimeStatus {
  name: string;
  status: typeof runtimeReadyStatus;
}

export * from './quiz.ts';
export * from './scoring.ts';

export * from './pr.ts';

export * from './selection.ts';
export * from './assessment.ts';
export * from './written-review.ts';
export * from './explainer.ts';
