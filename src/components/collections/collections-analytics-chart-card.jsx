import React, { useCallback, useMemo, useState } from 'react';
import { RiExpandDiagonalLine } from 'react-icons/ri';
import {
  COLLECTIONS_ANALYTICS_FY_OPTIONS,
  COLLECTIONS_ANALYTICS_PERIOD_OPTIONS,
  COLLECTIONS_CHART_COLORS,
  getCollectionsAnalyticsChartData,
} from '@/collections/analytics-constants';
import { StackedVerticalBarChartBlock } from '@/components/devx-ai-chart-visualizations';
import * as Button from '@/components/ui/button';
import { Root as Checkbox } from '@/components/ui/checkbox';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { formatInrCompact } from '@/utils/inr-format';

function ChartLegendToggle({ label, color, checked, onCheckedChange }) {
  return (
    <label className='flex shrink-0 cursor-pointer items-center gap-2'>
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} size='small' />
      <span className='inline-flex items-center gap-1.5 whitespace-nowrap text-paragraph-sm text-text-sub-600'>
        <span className='size-2.5 rounded-[2px]' style={{ backgroundColor: color }} />
        {label}
      </span>
    </label>
  );
}

export default function CollectionsAnalyticsChartCard({
  title,
  chartType,
  expectedLabel,
  actualLabel,
  period,
  onPeriodChange,
  fiscalYear,
  onFiscalYearChange,
  fiscalYearOptions = COLLECTIONS_ANALYTICS_FY_OPTIONS,
  chartData: chartDataProp,
  onExpand,
  expanded = false,
}) {
  const [showExpected, setShowExpected] = useState(true);
  const [showActual, setShowActual] = useState(true);

  const chartData = useMemo(() => {
    if (
      chartDataProp?.labels?.length &&
      Array.isArray(chartDataProp.expected) &&
      Array.isArray(chartDataProp.actual)
    ) {
      return {
        labels: chartDataProp.labels,
        categoryLabels: chartDataProp.categoryLabels ?? chartDataProp.labels,
        expected: chartDataProp.expected,
        actual: chartDataProp.actual,
      };
    }
    return getCollectionsAnalyticsChartData(chartType, period);
  }, [chartDataProp, chartType, period]);

  const resolvedFyOptions =
    Array.isArray(fiscalYearOptions) && fiscalYearOptions.length > 0
      ? fiscalYearOptions
      : COLLECTIONS_ANALYTICS_FY_OPTIONS;

  const formatChartValue = useCallback((value) => formatInrCompact(value), []);

  const stackedGroups = useMemo(() => {
    const groups = [];
    if (showActual) {
      groups.push({
        label: actualLabel,
        color: COLLECTIONS_CHART_COLORS.actual,
        data: chartData.actual,
      });
    }
    if (showExpected) {
      groups.push({
        label: expectedLabel,
        color: COLLECTIONS_CHART_COLORS.expected,
        data: chartData.expected.map((value, index) => {
          const actualValue = chartData.actual[index] ?? 0;
          return Math.max(value - actualValue, 0);
        }),
        tooltipData: chartData.expected,
      });
    }
    return groups;
  }, [actualLabel, chartData.actual, chartData.expected, expectedLabel, showActual, showExpected]);

  const displayTotals = useMemo(
    () =>
      chartData.labels.map((_, index) => {
        const actualValue = showActual ? (chartData.actual[index] ?? 0) : 0;
        const expectedValue = showExpected ? (chartData.expected[index] ?? 0) : 0;
        if (showActual && showExpected) return Math.max(actualValue, expectedValue);
        if (showExpected) return expectedValue;
        return actualValue;
      }),
    [chartData.actual, chartData.expected, chartData.labels, showActual, showExpected],
  );

  const chartModel = useMemo(() => {
    const maxRaw = Math.max(...displayTotals, 1);
    const step = maxRaw > 150000000 ? 50000000 : 15000000;
    const maxVal = Math.ceil(maxRaw / step) * step || 60000000;
    const tickValues = [maxVal, (maxVal * 3) / 4, maxVal / 2, maxVal / 4, 0];
    return { maxVal, tickValues };
  }, [displayTotals]);

  const barMinWidthPx = period === 'weekly' ? 24 : period === 'annually' ? 120 : undefined;

  return (
    <div
      className={cn(
        'flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_rgba(82,88,102,0.06)]',
        expanded ? 'min-h-[520px]' : 'min-h-[373px]',
      )}
    >
      <div className='flex min-w-0 items-center justify-between gap-4 border-b border-stroke-soft-200 px-5 py-4'>
        <h3 className='shrink-0 text-label-md text-text-strong-950'>{title}</h3>

        <div className='flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-4'>
          <div className='flex shrink-0 items-center gap-4'>
            <ChartLegendToggle
              label={expectedLabel}
              color={COLLECTIONS_CHART_COLORS.expected}
              checked={showExpected}
              onCheckedChange={setShowExpected}
            />
            <ChartLegendToggle
              label={actualLabel}
              color={COLLECTIONS_CHART_COLORS.actual}
              checked={showActual}
              onCheckedChange={setShowActual}
            />
          </div>

          <div className='h-5 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

          <div className='flex shrink-0 items-center gap-2'>
            <Select.Root value={period} onValueChange={onPeriodChange} size='xsmall'>
              <Select.Trigger className='w-[94px]'>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {COLLECTIONS_ANALYTICS_PERIOD_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <Select.Root value={fiscalYear} onValueChange={onFiscalYearChange} size='xsmall'>
              <Select.Trigger className='w-[118px]'>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {resolvedFyOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            {!expanded ? (
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                aria-label={`Expand ${title}`}
                onClick={() =>
                  onExpand?.({
                    title,
                    chartType,
                    expectedLabel,
                    actualLabel,
                    period,
                    fiscalYear,
                    chartData,
                  })
                }
              >
                <Button.Icon as={RiExpandDiagonalLine} />
              </Button.Root>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'min-w-0 px-2 pb-4 pt-2 sm:px-3',
          expanded ? 'min-h-[420px]' : 'min-h-[280px]',
        )}
      >
        {stackedGroups.length === 0 ? (
          <div className='flex h-full min-h-[220px] items-center justify-center text-paragraph-sm text-text-sub-500'>
            Select at least one series to display.
          </div>
        ) : (
          <StackedVerticalBarChartBlock
            labels={chartData.labels}
            categoryLabels={chartData.categoryLabels}
            groups={stackedGroups}
            totals={displayTotals}
            maxVal={chartModel.maxVal}
            tickValues={chartModel.tickValues}
            barAreaHeightPx={expanded ? 320 : 220}
            showDataLabels={false}
            formatValue={formatChartValue}
            barMinWidthPx={barMinWidthPx}
          />
        )}
      </div>
    </div>
  );
}
