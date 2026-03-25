import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";

export function NavigationProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timerRef.current);
    setProgress(0);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    reset();
    setVisible(true);
    setProgress(30);

    timerRef.current = setTimeout(() => setProgress(60), 100);

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setProgress(100);
        timerRef.current = setTimeout(reset, 300);
      });
    });

    return reset;
  }, [location.pathname, reset]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
        style={{
          width: `${progress}%`,
          transition:
            progress < 100
              ? "width 400ms cubic-bezier(0.4, 0, 0.2, 1)"
              : "width 200ms ease-out",
        }}
      />
    </div>
  );
}
