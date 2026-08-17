import { useLayoutEffect } from 'react';

const PREVIEW_Z_INDEX = 2147483646;

function restoreSiblingState(entry) {
  const { el, pointerEvents, inert, ariaHidden } = entry;
  el.style.pointerEvents = pointerEvents;
  if (inert) {
    el.inert = true;
  } else {
    el.removeAttribute('inert');
  }
  if (ariaHidden === null) {
    el.removeAttribute('aria-hidden');
  } else {
    el.setAttribute('aria-hidden', ariaHidden);
  }
}

/**
 * Blocks every other body subtree (drawer, sidebar, #root) from hover/clicks/inspect hit-testing.
 * `inert` beats nested `pointer-events: auto` inside Radix portals.
 */
export function useMediaPreviewLayerLock(open, layerRef) {
  useLayoutEffect(() => {
    if (!open) return undefined;

    let restored = [];

    const applyLock = () => {
      const layer = layerRef.current;
      if (!layer) return false;

      document.body.appendChild(layer);
      layer.style.pointerEvents = 'auto';
      layer.style.zIndex = String(PREVIEW_Z_INDEX);
      layer.removeAttribute('inert');

      restored = [];
      for (const child of document.body.children) {
        if (child === layer) continue;

        restored.push({
          el: child,
          pointerEvents: child.style.pointerEvents,
          inert: child.inert,
          ariaHidden: child.getAttribute('aria-hidden'),
        });

        child.style.pointerEvents = 'none';
        child.inert = true;
        child.setAttribute('aria-hidden', 'true');
      }

      return true;
    };

    if (!applyLock()) {
      const frameId = requestAnimationFrame(() => applyLock());
      return () => {
        cancelAnimationFrame(frameId);
        restored.forEach(restoreSiblingState);
      };
    }

    return () => {
      restored.forEach(restoreSiblingState);
    };
  }, [open]);
}
