import { useCallback, useState } from 'react';

const STORAGE_KEY = 'boards.sidebar.collapsed';

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredCollapsed(isCollapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0');
  } catch {
    // Ignore quota / private-mode failures; in-memory state still works.
  }
}

export default function useBoardsSidebarCollapsed() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readStoredCollapsed);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((previous) => {
      const next = !previous;
      writeStoredCollapsed(next);
      return next;
    });
  }, []);

  const setSidebarCollapsed = useCallback((next: boolean) => {
    setIsSidebarCollapsed(next);
    writeStoredCollapsed(next);
  }, []);

  return {
    isSidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
  };
}
