import { useEffect, useRef, useState } from 'react';

const PAGE_WIDTH = 2480;

/**
 * Scales fixed 2480px template pages to fit the preview container width.
 */
export function useProposalPageScale(enabled = true) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) {
      setScale(1);
      return undefined;
    }

    const node = containerRef.current;
    if (!node) return undefined;

    const update = () => {
      const width = node.clientWidth;
      if (!width) return;
      setScale(Math.min(1, width / PAGE_WIDTH));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return { containerRef, scale };
}
