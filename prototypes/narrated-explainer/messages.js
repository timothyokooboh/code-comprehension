export const messages = {
  title: 'Code Comprehension · Voice prototype',
  heading: 'Try a narrated walkthrough',
  introduction:
    'Use an installed device voice, or watch silently. No model download or API key.',
  voice: 'Voice',
  narration: 'Enable narration',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  position: 'Reading beat',
  loading: 'Preparing the walkthrough…',
  ready: 'Ready. Enable narration, choose a voice, then press Play.',
  unavailable: 'No local browser voice is available. Silent playback is ready.',
  failed: 'Speech was unavailable or failed. Continuing silently.',
  renderFailed: 'Unable to prepare the animation. Reload to retry.',
  speaking:
    'Narration controls the pace. Each diagram stays until its spoken explanation finishes.',
  silent: 'Silent playback uses the original reading times.',
  ended: 'Walkthrough complete.',
  localVoice: (voice) => `${voice.name} (${voice.lang})`,
  progress: (index, count) => `Beat ${index + 1} of ${count}`,
  note: 'Seeking cancels old speech. Resuming after Pause restarts the current beat. Narration has no three-minute cutoff; its script and voice determine duration.',
};
