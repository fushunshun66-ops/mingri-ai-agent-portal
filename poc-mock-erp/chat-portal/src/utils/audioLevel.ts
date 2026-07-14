/** 将 PCM RMS 放大到可视区间；正常说话约 4～8 */
export const AUDIO_LEVEL_GAIN = 6;

/**
 * 由采样算音量 level ∈ [0, 1]。
 * rms = sqrt(sum(x²)/n)，level = clamp(rms * gain, 0, 1)
 */
export function computeRmsLevel(
  samples: Float32Array | ArrayLike<number>,
  gain: number = AUDIO_LEVEL_GAIN,
): number {
  const n = samples.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = samples[i]!;
    sum += x * x;
  }
  const rms = Math.sqrt(sum / n);
  const level = rms * gain;
  if (level <= 0) return 0;
  if (level >= 1) return 1;
  return level;
}
