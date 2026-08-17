import React, { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/cn';

const LINE_CLAMP_CLASS = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};

/**
 * Text that clamps to N lines by default and expands to full content on click.
 * Reusable anywhere long descriptions need a compact table-cell presentation.
 */
const ExpandableClampText = ({
  text,
  lines = 3,
  className,
  textClassName,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  as = 'button',
  disabled = false,
}) => {
  const textRef = useRef(null);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [isTruncated, setIsTruncated] = useState(false);

  const isControlled = expandedProp !== undefined;
  const isExpanded = isControlled ? expandedProp : internalExpanded;

  const clampClass = LINE_CLAMP_CLASS[lines] ?? LINE_CLAMP_CLASS[3];

  const measureTruncation = useCallback(() => {
    const node = textRef.current;
    if (!node || isExpanded) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(node.scrollHeight > node.clientHeight + 1);
  }, [isExpanded]);

  useEffect(() => {
    measureTruncation();
  }, [text, lines, measureTruncation]);

  useEffect(() => {
    const node = textRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => measureTruncation());
    observer.observe(node);
    return () => observer.disconnect();
  }, [measureTruncation]);

  const setExpanded = useCallback(
    (next) => {
      if (!isControlled) setInternalExpanded(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange],
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setExpanded(!isExpanded);
  }, [disabled, isExpanded, setExpanded]);

  const Component = as;
  const isInteractive = !disabled && (isTruncated || isExpanded);

  return (
    <Component
      type={as === 'button' ? 'button' : undefined}
      onClick={isInteractive ? handleToggle : undefined}
      className={cn(
        'w-full text-left',
        isInteractive && 'cursor-pointer rounded-sm hover:opacity-90',
        className,
      )}
      aria-expanded={isExpanded}
      disabled={as === 'button' ? disabled || !isInteractive : undefined}
    >
      <p
        ref={textRef}
        className={cn(
          'break-words text-paragraph-sm text-text-main-900',
          !isExpanded && clampClass,
          textClassName,
        )}
      >
        {text || '--'}
      </p>
    </Component>
  );
};

export default ExpandableClampText;
