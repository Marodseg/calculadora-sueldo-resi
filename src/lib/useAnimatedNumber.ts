import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Anima un número hasta `target` con una curva ease-out. Respeta `prefers-reduced-motion`. */
export function useAnimatedNumber(target: number, durationMs = 450) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      current.current = from + (target - from) * (1 - Math.pow(1 - progress, 3));
      setValue(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return reduced ? target : value;
}
