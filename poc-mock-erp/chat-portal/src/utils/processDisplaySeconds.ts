/** 展示用耗时：时钟滞后约 1s，再 round，避免硬减 1 显得生硬 */
export const PROCESS_DISPLAY_LAG_MS = 1000;

export function toProcessDisplaySeconds(elapsedMs: number, minSeconds = 0): number {
  const adjusted = Math.max(0, elapsedMs - PROCESS_DISPLAY_LAG_MS);
  return Math.max(minSeconds, Math.round(adjusted / 1000));
}
