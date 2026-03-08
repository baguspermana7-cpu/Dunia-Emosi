import { useState, useEffect } from "react";

/**
 * Custom hook for responsive breakpoints
 * Returns responsive state for mobile-first layouts
 */
export function useResponsive() {
  const getState = () => {
    if (typeof window === "undefined") return { isMobile: false, isTablet: false, isDesktop: true, width: 1024 };
    const w = window.innerWidth;
    return {
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isDesktop: w >= 1024,
      width: w,
    };
  };

  const [state, setState] = useState(getState);

  useEffect(() => {
    let raf;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setState(getState()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return state;
}

export default useResponsive;
