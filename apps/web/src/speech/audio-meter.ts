const sampleCount = 64;
const waveformSize = 48;
const sampleIntervalMs = 60;
const unsignedSampleMidpoint = 128;
const displayGain = 4;

export function createAudioMeter(stream: MediaStream, update: (levels: number[]) => void) {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = sampleCount;
  source.connect(analyser);
  const samples = new Uint8Array(sampleCount);
  const history = Array<number>(waveformSize).fill(0);
  const timer = window.setInterval(sample, sampleIntervalMs);
  void context.resume().catch(() => {});

  function sample() {
    analyser.getByteTimeDomainData(samples);
    const amplitude = Math.sqrt(samples.reduce((sum, value) => sum + ((value - unsignedSampleMidpoint) / unsignedSampleMidpoint) ** 2, 0) / samples.length);
    history.shift();
    history.push(Math.min(1, amplitude * displayGain));
    update([...history]);
  }
  function close() {
    clearInterval(timer);
    source.disconnect();
    void context.close().catch(() => {});
  }
  return { close };
}
