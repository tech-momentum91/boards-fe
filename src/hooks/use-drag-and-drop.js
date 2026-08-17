import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook to handle drag and drop logic for file uploads.
 *
 * @param {Object} options
 * @param {React.RefObject} options.containerRef - Ref of the scrollable container.
 * @param {Function} options.onFilesDrop - Callback function when files are dropped.
 * @param {any} options.triggerDependency - Dependency to trigger overlay update (e.g. current data).
 * @returns {Object} - Hook values and handlers.
 */
export const useDragAndDrop = ({ containerRef, onFilesDrop, triggerDependency }) => {
  const [dragActive, setDragActive] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState('100%');
  const [messageTop, setMessageTop] = useState('50%');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesDrop?.(e.dataTransfer.files);
      }
    },
    [onFilesDrop],
  );

  useEffect(() => {
    if (dragActive && containerRef.current) {
      const updateOverlay = () => {
        if (containerRef.current) {
          const { scrollHeight } = containerRef.current;
          const viewportHeight = containerRef.current.clientHeight;
          setOverlayHeight(`${Math.max(scrollHeight, viewportHeight)}px`);

          const { scrollTop } = containerRef.current;
          const centerY = scrollTop + viewportHeight / 2;
          setMessageTop(`${centerY}px`);
        }
      };

      updateOverlay();

      const handleScroll = () => {
        updateOverlay();
      };

      const container = containerRef.current;
      container.addEventListener('scroll', handleScroll);

      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [dragActive, containerRef, triggerDependency]);

  return {
    dragActive,
    overlayHeight,
    messageTop,
    handleDrag,
    handleDrop,
    setDragActive,
  };
};
