import { useEffect, useState } from 'react';

import { releaseNoteAnchorId } from '@/components/release-note/utils';

function parseNoteIdsFromFingerprint(idsFingerprint) {
  if (!idsFingerprint) return [];
  return idsFingerprint.split('|').filter(Boolean);
}

/**
 * Highlights the release note aligned with a band ~40% above the viewport bottom, and snaps to the
 * last note when the scroll position is within ~40% of viewport height of the list bottom.
 *
 * @param {React.RefObject<HTMLElement | null>} scrollRef
 * @param {string} idsFingerprint – `note.id` values joined with `|`, same order as the list
 * @returns {[string | null, React.Dispatch<React.SetStateAction<string | null>>]}
 */
export function useReleaseNoteScrollSpy(scrollRef, idsFingerprint) {
  const [activeId, setActiveId] = useState(
    () => parseNoteIdsFromFingerprint(idsFingerprint)[0] ?? null,
  );

  useEffect(() => {
    const noteIds = parseNoteIdsFromFingerprint(idsFingerprint);
    setActiveId(noteIds[0] ?? null);
  }, [idsFingerprint]);

  useEffect(() => {
    const noteIds = parseNoteIdsFromFingerprint(idsFingerprint);
    const root = scrollRef.current;
    if (root && noteIds.length > 0) {
      const recompute = () => {
        const rootRect = root.getBoundingClientRect();
        /** Horizontal line at 40% from bottom of visible list → 60% from top */
        const anchorY = rootRect.top + rootRect.height * 0.6;

        const { scrollTop, scrollHeight, clientHeight } = root;
        const scrollBottom = scrollTop + clientHeight;
        const endSnapPx = Math.max(64, clientHeight * 0.4);

        let chosen = noteIds[0];

        if (scrollHeight - scrollBottom <= endSnapPx) {
          chosen = noteIds.at(-1);
        } else {
          for (let i = noteIds.length - 1; i >= 0; i -= 1) {
            const id = noteIds[i];
            const anchor = releaseNoteAnchorId(id);
            const el = root.querySelector(`#${CSS.escape(anchor)}`);
            if (!el) continue;
            const { top } = el.getBoundingClientRect();
            if (top <= anchorY) {
              chosen = id;
              break;
            }
          }
        }

        setActiveId((previous) => {
          if (previous === chosen) {
            return previous;
          }
          return chosen;
        });
      };

      let raf = 0;
      const schedule = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(recompute);
      };

      schedule();
      root.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });

      let ro = null;
      if ('ResizeObserver' in globalThis) {
        ro = new ResizeObserver(schedule);
        ro.observe(root);
      }

      return () => {
        cancelAnimationFrame(raf);
        root.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        ro?.disconnect();
      };
    }
    return undefined;
  }, [idsFingerprint, scrollRef]);

  return [activeId, setActiveId];
}
