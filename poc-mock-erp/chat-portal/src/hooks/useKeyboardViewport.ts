import { useCallback, useEffect, useState } from "react";

const KB_DELTA_MIN = 2;

export function useKeyboardViewport(isMobile: boolean): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const handleResize = useCallback(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const docHeight = document.documentElement.clientHeight;
    const kbHeight = Math.max(0, docHeight - viewport.height - viewport.offsetTop);
    setKeyboardHeight((prev) => (Math.abs(prev - kbHeight) > KB_DELTA_MIN ? kbHeight : prev));
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!isMobile || !viewport) return;
    let rafId: number | undefined;

    const onResize = () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleResize);
    };

    viewport.addEventListener("resize", onResize);
    viewport.addEventListener("scroll", onResize);
    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      viewport.removeEventListener("resize", onResize);
      viewport.removeEventListener("scroll", onResize);
    };
  }, [isMobile, handleResize]);

  return keyboardHeight;
}
