import React, { createContext, useContext, useMemo } from 'react';
import {
  PROJECT_TAB_STATUS,
  PROJECT_TASK_STATUS_SCOPE,
} from '@/constants/project-tab-status-config';
import { buildStatusMetaMap, useStatusOptions } from '@/hooks/use-status-options';

const TaskStatusScopeContext = createContext(null);

const EMPTY_SCOPE = {
  tabKey: null,
  context: null,
  completedStatus: null,
  statusOptions: [],
  statusMetaMap: {},
  loading: false,
};

/**
 * Provides dynamic Task.status options for one project detail tab.
 * Wrap each task-type section (GFC, Snags, etc.) once — tables and drawers read via useTaskStatusScope().
 */
export function TaskStatusScopeProvider({ tabKey, children }) {
  const tabConfig = PROJECT_TAB_STATUS[tabKey];
  const scope = useMemo(
    () => ({
      ...PROJECT_TASK_STATUS_SCOPE,
      context: tabConfig?.context,
      enabled: Boolean(tabConfig?.context),
    }),
    [tabConfig?.context],
  );
  const { options, loading } = useStatusOptions(scope);
  const statusMetaMap = useMemo(() => buildStatusMetaMap(options), [options]);

  const value = useMemo(
    () => ({
      tabKey,
      context: tabConfig?.context ?? null,
      completedStatus: tabConfig?.completed ?? null,
      statusOptions: options,
      statusMetaMap,
      loading,
    }),
    [tabKey, tabConfig?.completed, tabConfig?.context, loading, options, statusMetaMap],
  );

  return (
    <TaskStatusScopeContext.Provider value={value}>{children}</TaskStatusScopeContext.Provider>
  );
}

export function useTaskStatusScope() {
  return useContext(TaskStatusScopeContext) ?? EMPTY_SCOPE;
}
