import { useLayoutEffect, useRef, useState } from 'react';

const GAP = 8;
const VIEWPORT_PADDING = 8;
const DEFAULT_MENU_WIDTH = 256;

export function computeAnchoredMenuPosition(anchorRect, menuEl, fallbackRect = null) {
  const effectiveRect =
    anchorRect && anchorRect.width > 0 && anchorRect.height > 0
      ? anchorRect
      : fallbackRect && fallbackRect.width > 0 && fallbackRect.height > 0
        ? fallbackRect
        : anchorRect || fallbackRect;

  if (!effectiveRect || (effectiveRect.width === 0 && effectiveRect.height === 0)) {
    return { top: VIEWPORT_PADDING, left: VIEWPORT_PADDING, maxHeight: undefined };
  }

  const menuWidth = menuEl?.offsetWidth ?? DEFAULT_MENU_WIDTH;
  const menuHeight = menuEl?.offsetHeight ?? 0;

  const spaceBelow = window.innerHeight - effectiveRect.bottom - GAP - VIEWPORT_PADDING;
  const spaceAbove = effectiveRect.top - GAP - VIEWPORT_PADDING;

  let top = effectiveRect.bottom + GAP;
  let maxHeight = Math.max(spaceBelow, spaceAbove, 120);

  if (menuHeight > 0 && menuHeight > spaceBelow && spaceAbove > spaceBelow) {
    top = effectiveRect.top - GAP - menuHeight;
    maxHeight = spaceAbove;
  } else if (menuHeight > 0 && top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    const aboveTop = effectiveRect.top - GAP - menuHeight;
    if (aboveTop >= VIEWPORT_PADDING) {
      top = aboveTop;
      maxHeight = spaceAbove;
    } else {
      top = Math.max(VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING - menuHeight);
      maxHeight = window.innerHeight - VIEWPORT_PADDING * 2;
    }
  }

  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, window.innerHeight - VIEWPORT_PADDING - Math.min(menuHeight, maxHeight)),
  );

  let left = effectiveRect.left;
  if (left + menuWidth > window.innerWidth - VIEWPORT_PADDING) {
    left = effectiveRect.right - menuWidth;
  }
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING),
  );

  return {
    top,
    left,
    maxHeight: window.innerHeight - VIEWPORT_PADDING * 2,
  };
}

export function computeAnchoredSubmenuPosition(anchorRect, submenuEl, parentMenuRect) {
  if (!anchorRect) {
    return { top: 0, left: 0 };
  }

  const submenuWidth = submenuEl?.offsetWidth ?? DEFAULT_MENU_WIDTH;
  const submenuHeight = submenuEl?.offsetHeight ?? 0;
  const gap = GAP;
  const padding = VIEWPORT_PADDING;

  let left = parentMenuRect ? parentMenuRect.right + gap : anchorRect.right + gap;
  let top = anchorRect.top;

  if (left + submenuWidth > window.innerWidth - padding) {
    left = (parentMenuRect?.left ?? anchorRect.left) - gap - submenuWidth;
  }

  if (top + submenuHeight > window.innerHeight - padding) {
    top = window.innerHeight - padding - submenuHeight;
  }

  top = Math.max(padding, top);
  left = Math.max(padding, left);

  return { top, left };
}

export function useAnchoredSubmenuPosition(anchorRef, submenuRef, parentMenuRef) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchorRect = anchorRef?.current?.getBoundingClientRect();
      const parentMenuRect = parentMenuRef?.current?.getBoundingClientRect();
      setPosition(computeAnchoredSubmenuPosition(anchorRect, submenuRef.current, parentMenuRect));
    };

    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, parentMenuRef, submenuRef]);

  return position;
}

export default function useAnchoredMenuPosition(anchorRef, menuRef, fallbackAnchorRef = null) {
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: undefined });
  const lastAnchorRectRef = useRef(null);

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchorRect = anchorRef?.current?.getBoundingClientRect();
      const fallbackRect = fallbackAnchorRef?.current?.getBoundingClientRect();
      const menuEl = menuRef?.current;

      let effectiveRect = anchorRect;
      if (!anchorRect || (anchorRect.width === 0 && anchorRect.height === 0)) {
        effectiveRect =
          fallbackRect && fallbackRect.width > 0 && fallbackRect.height > 0
            ? fallbackRect
            : lastAnchorRectRef.current;
      }

      if (effectiveRect && effectiveRect.width > 0 && effectiveRect.height > 0) {
        lastAnchorRectRef.current = effectiveRect;
      }

      setPosition(computeAnchoredMenuPosition(effectiveRect, menuEl, fallbackRect));
    };

    updatePosition();
    requestAnimationFrame(updatePosition);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && menuRef?.current
        ? new ResizeObserver(updatePosition)
        : null;

    if (resizeObserver && menuRef.current) {
      resizeObserver.observe(menuRef.current);
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, fallbackAnchorRef, menuRef]);

  return position;
}
