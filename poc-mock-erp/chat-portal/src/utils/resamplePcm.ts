/** FunASR 目标采样率 */
export const TARGET_SAMPLE_RATE = 16000;

/** 判定「约等于」目标采样率的容差（Hz） */
export const SAMPLE_RATE_TOLERANCE_HZ = 100;

/** 实际采样率是否足够接近 expected（默认 ±100Hz） */
export function isApproxSampleRate(
  actual: number,
  expected: number = TARGET_SAMPLE_RATE,
  toleranceHz: number = SAMPLE_RATE_TOLERANCE_HZ,
): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) <= toleranceHz;
}

/** Float32 [-1,1] → Int16，越界 clamp */
export function float32ToInt16(input: Float32Array | ArrayLike<number>): Int16Array {
  const n = input.length;
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const s = input[i]!;
    const scaled = s * 32767;
    if (scaled > 32767) out[i] = 32767;
    else if (scaled < -32768) out[i] = -32768;
    else out[i] = scaled | 0;
  }
  return out;
}

/**
 * 线性重采样 Float32 → Int16 PCM。
 * fromRate === toRate（或非法 rate）时退化为 float32ToInt16。
 */
export function resampleFloat32ToInt16(
  input: Float32Array | ArrayLike<number>,
  fromRate: number,
  toRate: number,
): Int16Array {
  if (
    !Number.isFinite(fromRate) ||
    !Number.isFinite(toRate) ||
    fromRate <= 0 ||
    toRate <= 0 ||
    fromRate === toRate
  ) {
    return float32ToInt16(input);
  }

  const n = input.length;
  if (n === 0) return new Int16Array(0);

  const ratio = fromRate / toRate;
  const outLen = Math.floor(n / ratio);
  if (outLen <= 0) return new Int16Array(0);

  const out = new Int16Array(outLen);
  const last = n - 1;
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = i0 >= last ? last : i0 + 1;
    const frac = srcPos - i0;
    const sample = input[i0]! * (1 - frac) + input[i1]! * frac;
    const scaled = sample * 32767;
    if (scaled > 32767) out[i] = 32767;
    else if (scaled < -32768) out[i] = -32768;
    else out[i] = scaled | 0;
  }
  return out;
}

/**
 * 按实际 ctx.sampleRate 产出 FunASR 所需 16k Int16。
 * 已接近 16k 则直接量化；否则线性重采样到 16k。
 */
export function toFunAsrPcm16(
  input: Float32Array | ArrayLike<number>,
  actualSampleRate: number,
): Int16Array {
  if (isApproxSampleRate(actualSampleRate, TARGET_SAMPLE_RATE)) {
    return float32ToInt16(input);
  }
  return resampleFloat32ToInt16(input, actualSampleRate, TARGET_SAMPLE_RATE);
}
