"use client";

import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, durationMs = 350): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startedAtRef = useRef(performance.now());
  const targetRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    fromRef.current = value;
    targetRef.current = target;
    startedAtRef.current = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAtRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return value;
}
