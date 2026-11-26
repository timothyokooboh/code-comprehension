export const speechStates = { idle: 'idle', requesting: 'requesting', listening: 'listening', stopping: 'stopping' } as const;
export const speechErrors = {
  unsupported: 'unsupported', permission: 'permission', microphone: 'microphone',
  network: 'network', empty: 'empty', interrupted: 'interrupted', failed: 'failed', limit: 'limit',
} as const;
export type SpeechError = typeof speechErrors[keyof typeof speechErrors];
export type SpeechState = typeof speechStates[keyof typeof speechStates];

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
export interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  unspokenPunctuation?: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  start(): void; stop(): void; abort(): void;
}
export function recognitionConstructor(): (new () => Recognition) | undefined {
  const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
export function recognitionError(code: string): SpeechError {
  if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'NotAllowedError') return speechErrors.permission;
  if (code === 'audio-capture' || code === 'NotFoundError' || code === 'NotReadableError') return speechErrors.microphone;
  if (code === 'network') return speechErrors.network;
  if (code === 'no-speech') return speechErrors.empty;
  return speechErrors.failed;
}
export function appendTranscript(answer: string, transcript: string) {
  return answer + (answer && !/\s$/.test(answer) ? ' ' : '') + transcript.trim();
}
