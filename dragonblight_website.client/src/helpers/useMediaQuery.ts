import { useEffect, useState } from "react";

//for a layout that has to change what it renders or loads, which a stylesheet's media query can't do
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
