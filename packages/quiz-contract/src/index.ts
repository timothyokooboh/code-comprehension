export const applicationName = 'Code Comprehension';
export const runtimeStatusPath = '/api/status';
export const runtimeReadyStatus = 'ready';

export interface RuntimeStatus {
  name: string;
  status: typeof runtimeReadyStatus;
}

export * from './quiz.ts';
export * from './scoring.ts';

export * from './pr.ts';
