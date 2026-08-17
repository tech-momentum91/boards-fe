/**
 * Reveal full assistant text progressively after the API returns (UX streaming
 * without a streaming backend). Uses requestAnimationFrame for smooth updates.
 *
 * @param {string} fullText
 * @param {(slice: string) => void} onSlice
 * @param {{ charsPerFrame?: number }} [opts]
 *   Default charsPerFrame is tuned for ~10–15% slower reveal than 8 chars/frame (~14% longer).
 * @returns {Promise<void>}
 */
export function streamAssistantText(fullText, onSlice, opts = {}) {
  const charsPerFrame = opts.charsPerFrame ?? 7;
  if (!fullText) {
    onSlice('');
    return Promise.resolve();
  }
  if (fullText.length < 48) {
    onSlice(fullText);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      i = Math.min(fullText.length, i + charsPerFrame);
      onSlice(fullText.slice(0, i));
      if (i < fullText.length) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}
