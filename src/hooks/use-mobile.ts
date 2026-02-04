import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const SMALL_SCREEN_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsSmallScreen(width >= MOBILE_BREAKPOINT && width < SMALL_SCREEN_BREAKPOINT);
    };
    const mql = window.matchMedia(
      `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${SMALL_SCREEN_BREAKPOINT - 1}px)`,
    );
    mql.addEventListener("change", checkSize);
    checkSize();
    return () => mql.removeEventListener("change", checkSize);
  }, []);

  return !!isSmallScreen;
}
