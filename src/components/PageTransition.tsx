import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== pathRef.current) {
      pathRef.current = location.pathname;
      setVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }
  }, [location.pathname]);

  return (
    <div
      style={{ willChange: "opacity" }}
      className={`transition-opacity duration-150 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
