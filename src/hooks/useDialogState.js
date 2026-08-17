import { useState, useCallback } from 'react';

export function useDialogState() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  const openModal = useCallback((newData = null) => {
    setData(newData);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const handleOpenChange = useCallback(
    (open) => {
      if (!open) {
        closeModal();
      }
    },
    [closeModal],
  );

  return {
    isOpen,
    data,
    openModal,
    closeModal,
    handleOpenChange,
  };
}
