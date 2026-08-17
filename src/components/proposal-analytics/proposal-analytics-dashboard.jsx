import React, { useEffect, useMemo, useState } from 'react';

import { AnalyticsEmptyState } from '@/components/proposal-analytics/analytics-empty-state';
import { AnalyticsToolbar } from '@/components/proposal-analytics/analytics-toolbar';
import { CountryChart } from '@/components/proposal-analytics/country-chart';
import { DashboardCard } from '@/components/proposal-analytics/dashboard-card';
import { DeviceChart } from '@/components/proposal-analytics/device-chart';
import {
  asArray,
  buildVisitorDisplayNames,
  countLiveVisitors,
  filterDailyTrendsByRange,
  formatDuration,
  hasAnalyticsSignal,
} from '@/components/proposal-analytics/analytics-format-helpers';
import {
  buildSectionsFromTimeline,
  buildVisitorRowsFromTimeline,
  resolveDistribution,
} from '@/components/proposal-analytics/build-charts-from-timeline';
import { HorizontalBarChart } from '@/components/proposal-analytics/horizontal-bar-chart';
import { LiveVisitorsBadge } from '@/components/proposal-analytics/live-visitors-badge';
import { MetricCard } from '@/components/proposal-analytics/metric-card';
import { OSChart } from '@/components/proposal-analytics/os-chart';
import { ProposalAnalyticsSkeleton } from '@/components/proposal-analytics/proposal-analytics-skeleton';
import { SectionChart } from '@/components/proposal-analytics/section-chart';
import { TrendChart } from '@/components/proposal-analytics/trend-chart';
import { VisitorDurationChart } from '@/components/proposal-analytics/visitor-duration-chart';
import { VisitorTable } from '@/components/proposal-analytics/visitor-table';
import * as Button from '@/components/ui/button';
import { useProposalAnalytics } from '@/hooks/use-proposal-analytics';
import { useProposalDeckSections } from '@/components/proposal-analytics/use-proposal-deck-sections';
import { cn } from '@/utils/cn';

/**
 * Build a full-history daily series with both opens and unique visitors.
 * Prefers API daily rows; fills unique_visitors from timeline when missing.
 */
function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDailySeries(dailyRows, timelineRows) {
  const byDate = new Map();

  // Keep API daily values first so chart points never vanish if timeline is sparse.
  asArray(dailyRows).forEach((row) => {
    const raw = row.date || row.day || row.period;
    const dateKey = raw ? toLocalDateKey(raw) : '';
    if (!dateKey) return;
    byDate.set(dateKey, {
      date: dateKey,
      opens: Number(row.opens ?? row.count ?? 0),
      unique_visitors: Number(row.unique_visitors ?? row.unique ?? 0),
      visit_duration: Number(row.visit_duration ?? row.duration ?? 0),
    });
  });

  const timeline = asArray(timelineRows);
  if (timeline.length > 0) {
    const sessionsByDate = new Map();
    const visitorsByDate = new Map();
    const durationByDate = new Map();

    timeline.forEach((row) => {
      const dateKey = row?.event_time ? toLocalDateKey(row.event_time) : '';
      if (!dateKey) return;

      const visitorId = String(row.visitor_id || '').trim();
      // Fall back so visits still count when session_id is missing.
      const sessionId =
        String(row.session_id || '').trim() || (visitorId ? `${visitorId}::${dateKey}` : '');

      if (sessionId) {
        if (!sessionsByDate.has(dateKey)) sessionsByDate.set(dateKey, new Set());
        sessionsByDate.get(dateKey).add(sessionId);
      }
      if (visitorId) {
        if (!visitorsByDate.has(dateKey)) visitorsByDate.set(dateKey, new Set());
        visitorsByDate.get(dateKey).add(visitorId);
      }

      const duration = Number(row.duration ?? 0);
      if (Number.isFinite(duration) && duration > 0) {
        durationByDate.set(dateKey, (durationByDate.get(dateKey) || 0) + duration);
      }
    });

    const dateKeys = new Set([
      ...byDate.keys(),
      ...sessionsByDate.keys(),
      ...visitorsByDate.keys(),
      ...durationByDate.keys(),
    ]);

    dateKeys.forEach((dateKey) => {
      const existing = byDate.get(dateKey) || {
        date: dateKey,
        opens: 0,
        unique_visitors: 0,
        visit_duration: 0,
      };
      const timelineOpens = sessionsByDate.get(dateKey)?.size || 0;
      const timelineUnique = visitorsByDate.get(dateKey)?.size || 0;
      const timelineDuration = durationByDate.get(dateKey) || 0;

      // Take the stronger signal so values never drop when one source is incomplete.
      existing.opens = Math.max(existing.opens, timelineOpens);
      existing.unique_visitors = Math.max(existing.unique_visitors, timelineUnique);
      existing.visit_duration = Math.max(existing.visit_duration, timelineDuration);
      byDate.set(dateKey, existing);
    });
  }

  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * One chart point per visit/session: time on X, that visit's duration on Y
 * (e.g. 20 min and 2 min appear as separate spikes, like the reference analytics UI).
 */
function parseAnalyticsTime(value) {
  if (value == null || value === '') return Number.NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (value instanceof Date) return value.getTime();
  const raw = String(value).trim();
  if (!raw) return Number.NaN;
  // Frappe: "2026-07-21 10:30:00.123456" → ISO-ish for reliable parsing
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
  let ts = new Date(normalized).getTime();
  if (!Number.isFinite(ts)) ts = new Date(raw).getTime();
  return ts;
}

function buildVisitDurationTimeline(timelineRows, displayNames, visitorTableRows = []) {
  const nameMap =
    displayNames instanceof Map ? displayNames : new Map(Object.entries(displayNames || {}));

  const sessions = new Map();

  asArray(timelineRows).forEach((row) => {
    const visitorId = String(row.visitor_id || '').trim();
    const duration = Number(row.duration ?? 0);
    const eventTime = row.event_time;
    if (!visitorId || !eventTime || !Number.isFinite(duration) || duration <= 0) return;

    const sessionId = String(row.session_id || '').trim() || 'session';
    const key = `${visitorId}::${sessionId}`;
    const ts = parseAnalyticsTime(eventTime);
    if (!Number.isFinite(ts)) return;

    const eventType = String(row.event_type || '').toLowerCase();
    const existing = sessions.get(key) || {
      visitor_id: visitorId,
      session_id: sessionId,
      close_duration: 0,
      section_duration: 0,
      untagged_duration: 0,
      event_time: eventTime,
      ts: 0,
    };

    // Session length comes from proposal_close only. section_exit feeds the Sections
    // chart; summing both would ~2× inflate visit totals.
    if (eventType === 'proposal_close') {
      existing.close_duration = Math.max(existing.close_duration, duration);
    } else if (eventType === 'section_exit') {
      existing.section_duration += duration;
    } else if (!eventType) {
      existing.untagged_duration += duration;
    } else {
      return;
    }

    if (ts >= existing.ts) {
      existing.ts = ts;
      existing.event_time = eventTime;
    }
    sessions.set(key, existing);
  });

  // Fallback: visitor table totals when timeline events have no timed durations.
  if (sessions.size === 0) {
    asArray(visitorTableRows).forEach((row, index) => {
      const visitorId = String(row.visitor_id || '').trim();
      const duration = Number(row.total_time ?? row.visit_duration ?? 0);
      const eventTime = row.last_viewed || row.first_viewed || null;
      const ts = parseAnalyticsTime(eventTime);
      if (!visitorId || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(ts)) return;
      sessions.set(`${visitorId}::table-${index}`, {
        visitor_id: visitorId,
        session_id: `table-${index}`,
        close_duration: duration,
        section_duration: 0,
        untagged_duration: 0,
        event_time: eventTime,
        ts,
      });
    });
  }

  const orderedIds = [...nameMap.keys()];

  return [...sessions.values()]
    .map((row, index) => {
      const visitDuration =
        row.close_duration > 0
          ? row.close_duration
          : row.section_duration > 0
            ? row.section_duration
            : row.untagged_duration;
      const namedIndex = orderedIds.indexOf(row.visitor_id);
      const visitorName =
        nameMap.get(row.visitor_id) ||
        (namedIndex >= 0 ? `Visitor ${namedIndex + 1}` : `Visitor ${index + 1}`);
      return {
        visitor_id: row.visitor_id,
        session_id: row.session_id,
        visitor_name: visitorName,
        visit_duration: visitDuration,
        event_time: row.event_time,
        ts: row.ts,
        _key: `${row.ts}-${row.visitor_id}-${row.session_id}`,
      };
    })
    .filter((row) => row.visit_duration > 0)
    .sort((a, b) => a.ts - b.ts || a.visitor_id.localeCompare(b.visitor_id));
}

/**
 * Full Proposal Analytics dashboard.
 * Traffic KPIs + chart are combined; Total Visits / Unique Visitors switch the series.
 * Date range defaults to all-time history for the proposal.
 */
export function ProposalAnalyticsDashboard({ proposalId, className, enabled = true }) {
  const [dateRange, setDateRange] = useState(null);
  const [chartMetric, setChartMetric] = useState('opens');
  const [chartType, setChartType] = useState('area');
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, reload } = useProposalAnalytics(proposalId, {
    enabled,
    fromDate: dateRange?.from || null,
    toDate: dateRange?.to || null,
  });

  // Fetch section names from the proposal's deck_json so the Sections chart
  // shows a scaffold of all enabled pages even before section_enter events exist.
  const deckSections = useProposalDeckSections(proposalId);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [enabled]);

  const overview = data?.overview || {};
  const visitors = data?.visitors || {};
  const trends = data?.trends || {};
  const sections = data?.sections || {};
  const heatmap = data?.heatmap || {};

  const rawTimeline = useMemo(() => {
    const nested = asArray(visitors.visitor_timeline);
    if (nested.length > 0) return nested;
    return asArray(data?.visitor_timeline);
  }, [visitors.visitor_timeline, data?.visitor_timeline]);

  const visitorTableRows = useMemo(() => {
    const fromTimeline = buildVisitorRowsFromTimeline(rawTimeline);
    if (fromTimeline.length > 0) return fromTimeline;

    const fromTable = asArray(visitors.visitor_table);
    if (fromTable.length > 0) return fromTable;

    const fromList = asArray(visitors.visitors);
    if (fromList.length > 0) {
      return fromList.map((row) => ({
        visitor_id: row.visitor_id,
        visits: row.visits ?? 1,
        avg_time: row.avg_time ?? row.average_time ?? 0,
        total_time: row.total_time ?? 0,
        last_viewed: row.last_viewed || row.last_seen || null,
      }));
    }

    return [];
  }, [visitors.visitor_table, visitors.visitors, rawTimeline]);

  const visitorNameMap = useMemo(() => {
    const fromTable = visitorTableRows.map((row) => ({
      visitor_id: row.visitor_id,
      first_viewed: row.first_viewed,
      last_viewed: row.last_viewed,
    }));
    const fromTimeline = asArray(rawTimeline).map((row) => ({
      visitor_id: row.visitor_id,
      first_viewed: row.event_time,
      last_viewed: row.event_time,
    }));
    return buildVisitorDisplayNames([...fromTable, ...fromTimeline]);
  }, [visitorTableRows, rawTimeline]);

  const fullDailySeries = useMemo(
    () => buildDailySeries(asArray(trends.daily), rawTimeline),
    [trends.daily, rawTimeline],
  );

  const hasDateFilter = Boolean(dateRange?.from || dateRange?.to);

  const timelineInRange = useMemo(() => {
    if (!hasDateFilter) return rawTimeline;
    return asArray(rawTimeline).filter((row) => {
      if (!row?.event_time) return false;
      const time = new Date(row.event_time).getTime();
      if (!Number.isFinite(time)) return false;
      if (dateRange.from) {
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        if (time < from.getTime()) return false;
      }
      if (dateRange.to) {
        const to = new Date(dateRange.to);
        to.setHours(23, 59, 59, 999);
        if (time > to.getTime()) return false;
      }
      return true;
    });
  }, [rawTimeline, dateRange, hasDateFilter]);

  const timelineVisitorRows = useMemo(
    () => buildVisitorRowsFromTimeline(timelineInRange),
    [timelineInRange],
  );

  const visitDurationTimeline = useMemo(
    () =>
      buildVisitDurationTimeline(
        timelineInRange,
        visitorNameMap,
        timelineVisitorRows.length > 0 ? timelineVisitorRows : visitorTableRows,
      ),
    [timelineInRange, visitorNameMap, timelineVisitorRows, visitorTableRows],
  );

  const dailyTrend = useMemo(
    () => filterDailyTrendsByRange(fullDailySeries, dateRange),
    [fullDailySeries, dateRange],
  );

  const chartData = dailyTrend;

  /** Opens in the filtered trend window — keeps KPI/breakdowns aligned with the chart. */
  const rangeHasActivity = useMemo(() => {
    if (!hasDateFilter) return true;
    const opens = dailyTrend.reduce((sum, row) => sum + Number(row.opens || 0), 0);
    return opens > 0 || asArray(timelineInRange).length > 0;
  }, [hasDateFilter, dailyTrend, timelineInRange]);

  const namedVisitorTableRows = useMemo(() => {
    // Date filter is global: only visitors active in the selected range.
    if (hasDateFilter) {
      if (!rangeHasActivity) return [];
      return timelineVisitorRows.map((row) => ({
        ...row,
        visitor_name: visitorNameMap.get(row.visitor_id) || row.visitor_id,
      }));
    }
    const source = timelineVisitorRows.length > 0 ? timelineVisitorRows : visitorTableRows;
    return source.map((row) => ({
      ...row,
      visitor_name: visitorNameMap.get(row.visitor_id) || row.visitor_id,
    }));
  }, [timelineVisitorRows, hasDateFilter, rangeHasActivity, visitorTableRows, visitorNameMap]);

  const filteredSections = useMemo(() => {
    if (hasDateFilter) {
      if (!rangeHasActivity) {
        return { data: [], totalTime: [], averageTime: [] };
      }
      return {
        data: buildSectionsFromTimeline(timelineInRange),
        totalTime: [],
        averageTime: [],
      };
    }
    const fromTimeline = buildSectionsFromTimeline(timelineInRange);
    if (fromTimeline.length > 0) {
      return { data: fromTimeline, totalTime: [], averageTime: [] };
    }
    return {
      data: asArray(sections.sections?.length ? sections.sections : sections.views),
      totalTime: asArray(sections.total_time),
      averageTime: asArray(sections.average_time),
    };
  }, [timelineInRange, hasDateFilter, rangeHasActivity, sections]);

  const visitorProfiles = useMemo(() => {
    return [...asArray(visitors.visitor_table), ...asArray(visitors.visitors), ...visitorTableRows];
  }, [visitors.visitor_table, visitors.visitors, visitorTableRows]);

  const filteredDevices = useMemo(() => {
    if (hasDateFilter && !rangeHasActivity) return [];
    return resolveDistribution({
      timelineInRange,
      fullTimeline: rawTimeline,
      field: 'device',
      profileRows: visitorProfiles,
      apiRows: heatmap.device_distribution,
      hasDateFilter,
    });
  }, [
    timelineInRange,
    rawTimeline,
    visitorProfiles,
    heatmap.device_distribution,
    hasDateFilter,
    rangeHasActivity,
  ]);

  const filteredOs = useMemo(() => {
    if (hasDateFilter && !rangeHasActivity) return [];
    return resolveDistribution({
      timelineInRange,
      fullTimeline: rawTimeline,
      field: 'os',
      profileRows: visitorProfiles,
      apiRows: heatmap.os_distribution,
      hasDateFilter,
    });
  }, [
    timelineInRange,
    rawTimeline,
    visitorProfiles,
    heatmap.os_distribution,
    hasDateFilter,
    rangeHasActivity,
  ]);

  const filteredCountries = useMemo(() => {
    if (hasDateFilter && !rangeHasActivity) return [];
    return resolveDistribution({
      timelineInRange,
      fullTimeline: rawTimeline,
      field: 'country',
      profileRows: visitorProfiles,
      apiRows: heatmap.country_distribution,
      hasDateFilter,
    });
  }, [
    timelineInRange,
    rawTimeline,
    visitorProfiles,
    heatmap.country_distribution,
    hasDateFilter,
    rangeHasActivity,
  ]);

  const filteredBrowsers = useMemo(() => {
    if (hasDateFilter && !rangeHasActivity) return [];
    return resolveDistribution({
      timelineInRange,
      fullTimeline: rawTimeline,
      field: 'browser',
      profileRows: visitorProfiles,
      apiRows: heatmap.browser_distribution,
      hasDateFilter,
    });
  }, [
    timelineInRange,
    rawTimeline,
    visitorProfiles,
    heatmap.browser_distribution,
    hasDateFilter,
    rangeHasActivity,
  ]);

  const rangeOverview = useMemo(() => {
    const uniqueIds = new Set();
    const sessionIds = new Set();
    asArray(timelineInRange).forEach((row) => {
      const id = String(row?.visitor_id || '').trim();
      if (id) uniqueIds.add(id);
      const sessionId =
        String(row?.session_id || '').trim() ||
        (id && row?.event_time ? `${id}::${toLocalDateKey(row.event_time)}` : '');
      if (sessionId) sessionIds.add(sessionId);
    });
    const timelineTime = visitDurationTimeline.reduce(
      (sum, row) => sum + Number(row.visit_duration || 0),
      0,
    );
    const apiOpens = Number(overview.total_opens || 0);
    const apiUnique = Number(overview.unique_visitors || 0);
    const apiTime = Number(overview.total_time_spent || 0);

    // With a date filter, trust the filtered timeline only.
    if (hasDateFilter) {
      return {
        total_opens: sessionIds.size,
        unique_visitors: uniqueIds.size,
        total_time_spent: timelineTime,
      };
    }

    // All-time: keep the higher of timeline vs API so KPI values never disappear.
    return {
      total_opens: Math.max(sessionIds.size, apiOpens),
      unique_visitors: Math.max(uniqueIds.size, apiUnique),
      total_time_spent: Math.max(timelineTime, apiTime),
    };
  }, [overview, timelineInRange, visitDurationTimeline, hasDateFilter]);

  const liveVisitors = useMemo(() => {
    void nowTick;
    const fromApi = data?.live_visitors ?? visitors?.live_visitors ?? overview?.live_visitors;
    if (fromApi != null && fromApi !== '') {
      const parsed = Number(fromApi);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return countLiveVisitors(rawTimeline);
  }, [data?.live_visitors, visitors?.live_visitors, overview?.live_visitors, rawTimeline, nowTick]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  // Keep existing values visible while refreshing — only skeleton on first load.
  if (loading && !data) {
    return (
      <div className={cn('mx-auto w-full max-w-[880px]', className)}>
        <ProposalAnalyticsSkeleton />
      </div>
    );
  }

  // Full-page error only when there is nothing cached to show.
  if (error && !data) {
    return (
      <div
        className={cn('flex min-h-[320px] flex-col items-center justify-center gap-3', className)}
      >
        <AnalyticsEmptyState title='Unable to load analytics' description={error} />
        <Button.Root type='button' variant='neutral' mode='stroke' size='small' onClick={reload}>
          Retry
        </Button.Root>
      </div>
    );
  }

  if (!data || !hasAnalyticsSignal(data)) {
    return (
      <div className={cn('flex min-h-[320px] items-center justify-center', className)}>
        <AnalyticsEmptyState
          title='No analytics available'
          description='Share this proposal and open the public link to start collecting engagement data.'
        />
      </div>
    );
  }

  return (
    <div className={cn('mx-auto flex w-full max-w-[880px] flex-col gap-5', className)}>
      {error ? (
        <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
          <p className='text-paragraph-x-small text-text-sub-500'>
            Could not refresh analytics. Showing the last loaded data.
          </p>
          <Button.Root type='button' variant='neutral' mode='stroke' size='xsmall' onClick={reload}>
            Retry
          </Button.Root>
        </div>
      ) : null}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <AnalyticsToolbar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        <LiveVisitorsBadge count={liveVisitors} />
      </div>

      <DashboardCard className='overflow-hidden p-4'>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <MetricCard
            label='Total Visits'
            value={rangeOverview.total_opens ?? 0}
            // hint='Distinct sessions that engaged with this proposal'
            selectable
            selected={chartMetric === 'opens'}
            onClick={() => setChartMetric('opens')}
          />
          <MetricCard
            label='Unique Visitors'
            value={rangeOverview.unique_visitors ?? 0}
            // hint='Distinct visitors who engaged with this proposal'
            selectable
            selected={chartMetric === 'unique'}
            onClick={() => setChartMetric('unique')}
          />
          <MetricCard
            label='Total Visit Duration'
            value={formatDuration(rangeOverview.total_time_spent)}
            // hint='Total time spent across all visitors — click to see visit duration over time'
            selectable
            selected={chartMetric === 'duration'}
            onClick={() => setChartMetric('duration')}
          />
        </div>

        <div className='mt-4 border-t border-stroke-soft-200 pt-4'>
          {chartMetric === 'duration' ? (
            <VisitorDurationChart
              key={`duration-${chartType}`}
              data={visitDurationTimeline}
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          ) : (
            <TrendChart
              key={`${chartMetric}-${chartType}`}
              data={chartData}
              metric={chartMetric}
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          )}
        </div>
      </DashboardCard>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <SectionChart
          data={filteredSections.data}
          totalTime={filteredSections.totalTime}
          averageTime={filteredSections.averageTime}
          deckSections={filteredSections.data.length === 0 ? deckSections : []}
        />
        <DeviceChart data={filteredDevices} />
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <OSChart data={filteredOs} />
        <CountryChart data={filteredCountries} />
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <HorizontalBarChart
          title='Browser'
          data={filteredBrowsers}
          labelKey='browser'
          valueKey='users'
          valueLabel='Visitors'
          emptyTitle='No browser data'
          emptyDescription='Browser mix appears after tracked visits.'
        />
        <VisitorTable data={namedVisitorTableRows} />
      </div>
    </div>
  );
}

export default ProposalAnalyticsDashboard;
