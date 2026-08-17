import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import apiClient from '@/api/axios';
import {
  buildGroupedBarChartFromRows,
  niceCeil,
  StackedVerticalBarChartBlock,
  VerticalBarChartBlock,
} from '@/components/devx-ai-chart-visualizations';
import { MultiSelect } from '@/components/ui/multi-select';
import { selectCenterAccess } from '@/redux/centerSlice';
import { extractErrorMessage } from '@/utils/error-utils';
import {
  GLOBAL_CENTER_STATUS,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';
import { cn } from '@/utils/cn';

function rowsToChartModel(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { labels: [], series: [], groupedBar: null, maxVal: 1, tickValues: [0, 1] };
  }

  const chartRows = rows.map((r) => ({
    x_value: r.user_name || r.user || 'User',
    y_value: Number(r.count) || 0,
    group_value: r.role || 'Unassigned',
  }));

  const groupedBar = buildGroupedBarChartFromRows(chartRows);
  if (groupedBar) {
    const maxVal = niceCeil(Math.max(...groupedBar.totals, 1));
    const tickValues = [maxVal, (maxVal * 2) / 3, maxVal / 3, 0];
    return { groupedBar, labels: groupedBar.labels, series: groupedBar.totals, maxVal, tickValues };
  }

  const labels = chartRows.map((r) => r.x_value);
  const series = chartRows.map((r) => r.y_value);
  const maxVal = niceCeil(Math.max(...series, 1));
  const tickValues = [maxVal, (maxVal * 2) / 3, maxVal / 3, 0];
  return { labels, series, groupedBar: null, maxVal, tickValues };
}

function AnalyticsChartCard({
  title,
  description,
  loading,
  error,
  onRetry,
  chartModel,
  emptyText,
}) {
  const { labels, series, groupedBar, maxVal, tickValues } = chartModel;

  return (
    <div
      className={cn(
        'flex min-h-[320px] flex-col gap-4 rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-5',
        'shadow-[0_1px_2px_0_rgba(228,229,231,0.24)]',
      )}
    >
      <div className='space-y-1'>
        <h3 className='text-label-md font-semibold text-text-strong-950'>{title}</h3>
        <p className='text-paragraph-sm text-text-sub-600'>{description}</p>
      </div>

      <div className='flex min-h-[220px] flex-1 flex-col justify-center'>
        {loading ? (
          <p className='text-paragraph-sm text-text-sub-500'>Loading chart data…</p>
        ) : error ? (
          <div className='space-y-2'>
            <p className='text-paragraph-sm text-error-base'>{error}</p>
            {onRetry ? (
              <button
                type='button'
                className='text-label-sm font-medium text-primary-base hover:underline'
                onClick={onRetry}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : labels.length === 0 ? (
          <p className='text-paragraph-sm text-text-sub-500'>{emptyText}</p>
        ) : groupedBar ? (
          <StackedVerticalBarChartBlock
            labels={groupedBar.labels}
            groups={groupedBar.groups}
            totals={groupedBar.totals}
            maxVal={maxVal}
            tickValues={tickValues}
            barAreaHeightPx={180}
          />
        ) : (
          <VerticalBarChartBlock
            labels={labels}
            series={series}
            maxVal={maxVal}
            tickValues={tickValues}
            barAreaHeightPx={180}
          />
        )}
      </div>
    </div>
  );
}

const MyTaskAnalytics = () => {
  const centerAccess = useSelector(selectCenterAccess);
  const allCenterData = useSelector((state) => state.center?.centerAccess?.data ?? []);
  const selectedCenters = useSelector((state) => state.center?.centerAccess?.selectedCenters ?? []);
  const isAllCenter = useSelector((state) => state.center?.centerAccess?.isAllCenter ?? true);

  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const allSelected = allCenterData.length > 0 && selectedCenters.length >= allCenterData.length;

  const centersForApi = useMemo(() => {
    if (centerAccessLoading) return undefined;
    if (globalCenterIntent.status === GLOBAL_CENTER_STATUS.Empty) return [];
    if (allSelected && isAllCenter) return 'All';
    return selectedCenters;
  }, [centerAccessLoading, allSelected, isAllCenter, globalCenterIntent.status, selectedCenters]);

  const [roleOptions, setRoleOptions] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [analytics, setAnalytics] = useState({
    unread_notifications: [],
    overdue_tasks: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiClient.get(
          '/method/devx.api.my_task_analytics.get_my_task_analytics_role_options',
        );
        const roles = response?.data?.message?.roles;
        if (!cancelled && Array.isArray(roles)) {
          setRoleOptions(roles.map((r) => ({ label: r, value: r })));
        }
      } catch {
        /* role options are optional; analytics fetch still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (centersForApi === undefined) return;
    if (noCenters) {
      setAnalytics({ unread_notifications: [], overdue_tasks: [] });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (centersForApi === 'All') {
        params.centers = 'All';
      } else if (Array.isArray(centersForApi)) {
        params.centers = JSON.stringify(centersForApi);
      }
      if (selectedRoles.length > 0) {
        params.roles = JSON.stringify(selectedRoles);
      }
      const response = await apiClient.get(
        '/method/devx.api.my_task_analytics.get_my_task_analytics',
        {
          params,
        },
      );
      const message = response?.data?.message ?? {};
      setAnalytics({
        unread_notifications: Array.isArray(message.unread_notifications)
          ? message.unread_notifications
          : [],
        overdue_tasks: Array.isArray(message.overdue_tasks) ? message.overdue_tasks : [],
      });
      if (Array.isArray(message.role_options) && message.role_options.length > 0) {
        setRoleOptions(message.role_options.map((r) => ({ label: r, value: r })));
      }
    } catch (error_) {
      setError(extractErrorMessage(error_, 'Failed to load analytics'));
      setAnalytics({ unread_notifications: [], overdue_tasks: [] });
    } finally {
      setLoading(false);
    }
  }, [centersForApi, noCenters, selectedRoles]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const unreadChart = useMemo(
    () => rowsToChartModel(analytics.unread_notifications),
    [analytics.unread_notifications],
  );
  const overdueChart = useMemo(
    () => rowsToChartModel(analytics.overdue_tasks),
    [analytics.overdue_tasks],
  );

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='min-w-[240px] max-w-md flex-1'>
          <p className='mb-1.5 text-label-sm font-medium text-text-sub-600'>Filter by role</p>
          <MultiSelect
            options={roleOptions}
            value={selectedRoles}
            onValueChange={setSelectedRoles}
            placeholder='All roles'
            className='w-full'
            size='medium'
            enableSearch={roleOptions.length > 8}
          />
        </div>
      </div>

      <div className='flex flex-col gap-6'>
        <AnalyticsChartCard
          title='Unread inbox notifications'
          description='Primary inbox unread count per user, segmented by role.'
          loading={loading}
          error={error}
          onRetry={fetchAnalytics}
          chartModel={unreadChart}
          emptyText={
            noCenters
              ? 'Select at least one centre to view notification analytics.'
              : 'No unread inbox notifications for the selected filters.'
          }
        />
        <AnalyticsChartCard
          title='Overdue tasks'
          description='Overdue task count per assignee, segmented by role.'
          loading={loading}
          error={error}
          onRetry={fetchAnalytics}
          chartModel={overdueChart}
          emptyText={
            noCenters
              ? 'Select at least one centre to view overdue task analytics.'
              : 'No overdue tasks for the selected filters.'
          }
        />
      </div>
    </div>
  );
};

export default MyTaskAnalytics;
