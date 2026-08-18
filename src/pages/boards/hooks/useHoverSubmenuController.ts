import { useCallback, useEffect, useRef, useState } from 'react';

const CLOSE_DELAY_MS = 150;

export default function useHoverSubmenuController() {
  const [activeKey, setActiveKey] = useState(null);
  const closeTimerRef = useRef(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const openSubmenu = useCallback(
    (key) => {
      clearCloseTimer();
      setActiveKey(key);
    },
    [clearCloseTimer],
  );

  const closeSubmenu = useCallback(() => {
    clearCloseTimer();
    setActiveKey(null);
  }, [clearCloseTimer]);

  const scheduleCloseSubmenu = useCallback(
    (key) => {
      clearCloseTimer();
      closeTimerRef.current = setTimeout(() => {
        setActiveKey((current) => (current === key ? null : current));
      }, CLOSE_DELAY_MS);
    },
    [clearCloseTimer],
  );

  const getItemHandlers = useCallback(
    (key) => ({
      onMouseEnter: () => openSubmenu(key),
      onMouseLeave: () => scheduleCloseSubmenu(key),
    }),
    [openSubmenu, scheduleCloseSubmenu],
  );

  const getPanelHandlers = useCallback(
    (key) => ({
      onMouseEnter: () => openSubmenu(key),
      onMouseLeave: () => scheduleCloseSubmenu(key),
    }),
    [openSubmenu, scheduleCloseSubmenu],
  );

  const isOpen = useCallback((key) => activeKey === key, [activeKey]);

  return {
    activeKey,
    openSubmenu,
    closeSubmenu,
    getItemHandlers,
    getPanelHandlers,
    isOpen,
  };
}
