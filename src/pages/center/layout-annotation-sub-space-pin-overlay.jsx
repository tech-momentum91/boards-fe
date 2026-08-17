import React from 'react';

/**
 * Small canvas marker for a server sub-space pin. Details are shown on shape hover
 * ({@link SubSpaceInfoCanvasHoverPopover}), not via a separate info control.
 *
 * @param {{ annotation: object }} props
 */
export default function SubSpacePinOverlay({ annotation: _annotation }) {
  return (
    <span
      className='pointer-events-none flex size-2 shrink-0 rounded-full bg-teal-600 shadow-sm ring-1 ring-white/90'
      aria-hidden
    />
  );
}
