import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

function serializeMultilineText(value) {
  return String(value ?? '').replaceAll('\r\n', '\n');
}

function readEditableText(node, multiline) {
  if (!node) return '';
  const raw = multiline
    ? node.textContent.replaceAll('\r\n', '\n')
    : node.textContent.replaceAll('\r\n', '\n');
  return raw.trim();
}

function normalizeEditableText(text, multiline) {
  const base = serializeMultilineText(text).trim();
  return multiline ? base : base.replaceAll(/\s+/g, ' ');
}

/**
 * Fixed-position text field — content only, styling controlled by template CSS.
 */
export default function EditableText({
  value,
  onChange,
  path,
  className = '',
  element: Element = 'p',
  multiline = false,
  readOnly = false,
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  const display = serializeMultilineText(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || focused || readOnly || !onChange) return;
    if (readEditableText(el, multiline) !== display.trim()) {
      el.textContent = display;
    }
  }, [display, focused, multiline, onChange, readOnly]);

  const handleBlur = useCallback(
    (event) => {
      setFocused(false);
      if (!onChange || readOnly) return;
      const next = readEditableText(event.currentTarget, multiline);
      const prev = normalizeEditableText(display, multiline);
      if (next !== prev) {
        onChange(path, next);
      }
    },
    [onChange, path, display, multiline, readOnly],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (!multiline || readOnly || event.key !== 'Enter') return;
      event.preventDefault();
      if (typeof document.execCommand === 'function') {
        document.execCommand('insertText', false, '\n');
      }
    },
    [multiline, readOnly],
  );

  const textClassName = [
    'proposal-editable-text',
    multiline ? 'proposal-editable-text--multiline' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (readOnly || !onChange) {
    return (
      <Element ref={ref} className={textClassName}>
        {display}
      </Element>
    );
  }

  return (
    <Element
      ref={ref}
      className={[
        textClassName,
        'proposal-editable-text--editable',
        focused ? 'proposal-editable-text--focused' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      contentEditable
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-edit-path={path?.join?.('.') ?? path}
      data-editable-type='text'
    />
  );
}
