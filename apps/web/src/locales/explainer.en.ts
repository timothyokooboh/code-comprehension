export const explainerMessages = {
  loading: 'Loading the walkthrough…',
  failed:
    'Unable to load this walkthrough. Check that the CLI is running, then retry.',
  renderFailed:
    'The animation could not be displayed. Retry, or read the walkthrough below.',
  retry: 'Retry',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  position: 'Playback position',
  chapters: 'Chapters',
  canvas: 'Animated walkthrough; a text equivalent follows below.',
  companion: 'Read the walkthrough',
  transcript: 'Scene-by-scene explanation',
  reference: (path: string, line?: number) => (line ? `${path}:${line}` : path),
  connection: (from: string, to: string) => `${from} → ${to}`,
  snapshot: 'Source snapshot',
  uncommitted: 'Includes uncommitted changes',
  silent: 'Silent walkthrough',
  time: (current: number, total: number) =>
    `${formatTime(current)} / ${formatTime(total)}`,
};
function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
