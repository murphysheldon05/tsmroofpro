import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useTransition } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const pathRef = useRef(location.pathname);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (location.pathname !== pathRef.current) {
      pathRef.current = location.pathname;
      setTransitioning(true);

      const timeout = setTimeout(() => {
        startTransition(() => {
          setDisplayChildren(children);
          setTransitioning(false);
        });
      }, 80);

      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className="transition-[opacity,transform] duration-200 ease-out"
      style={{
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "translateY(4px)" : "translateY(0)",
        willChange: transitioning ? "opacity, transform" : "auto",
      }}
    >
      {displayChildren}
    </div>
  );
}
