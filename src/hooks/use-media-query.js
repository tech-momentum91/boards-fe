import { useEffect, useState } from 'react';

/** Matches Tailwind `md` (min-width). */
export const MEDIA_QUERY_MD_UP = '(min-width: 768px)';

/**
 * Subscribes to a CSS media query. Updates when the viewport crosses the breakpoint.
 * @param {string} query Passed to `window.matchMedia`, e.g. `(min-width: 768px)`
 * @returns {boolean} Whether the query currently matches
 */
export function useMediaQuery(query) {
  const getMatches = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mql = window.matchMedia(query);
    const onChange = () => {
      setMatches(mql.matches);
    };

    setMatches(mql.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}
