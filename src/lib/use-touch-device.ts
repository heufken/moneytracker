import { useEffect, useState } from "react";

/**
 * Touch devices have no hover; Recharts tooltip there must use
 * trigger="click" because its touch handler only reacts to touchmove,
 * so a static tap would show nothing.
 */
export function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const onChange = (e: MediaQueryListEvent) => setTouch(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return touch;
}
