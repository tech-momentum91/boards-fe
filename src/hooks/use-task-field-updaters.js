import { useCallback } from 'react';

/**
 * Custom hook that provides common task field update handlers
 * @param {Function} handleFieldUpdate - Function to update task field
 * @returns {Object} Object containing all field update handlers
 */
export const useTaskFieldUpdaters = (handleFieldUpdate) => {
  const handlePriorityUpdate = useCallback(
    async (taskId, priority) => {
      await handleFieldUpdate(taskId, 'priority', priority);
    },
    [handleFieldUpdate],
  );

  const handleStatusUpdate = useCallback(
    async (taskId, status) => {
      await handleFieldUpdate(taskId, 'status', status);
    },
    [handleFieldUpdate],
  );

  const handleDueDateUpdate = useCallback(
    async (taskId, dueDate) => {
      await handleFieldUpdate(taskId, 'due_date', dueDate);
    },
    [handleFieldUpdate],
  );

  return {
    handlePriorityUpdate,
    handleStatusUpdate,
    handleDueDateUpdate,
  };
};
