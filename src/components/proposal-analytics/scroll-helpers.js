/**
 * When a nested scroll pane is at its top/bottom edge, forward the wheel
 * delta to the analytics modal body so page scroll does not get stuck.
 */
export function forwardWheelToParentWhenAtEdge(event) {
  const el = event.currentTarget;
  if (!(el instanceof HTMLElement)) return;

  const { scrollTop, scrollHeight, clientHeight } = el;
  const deltaY = event.deltaY;
  if (!deltaY) return;

  const canScroll = scrollHeight > clientHeight + 1;
  const atTop = scrollTop <= 0;
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
  const shouldForward = !canScroll || (deltaY < 0 && atTop) || (deltaY > 0 && atBottom);

  if (!shouldForward) return;

  const parent = el.closest('[data-proposal-analytics-scroll]');
  if (!(parent instanceof HTMLElement)) return;

  parent.scrollTop += deltaY;
  event.preventDefault();
}
