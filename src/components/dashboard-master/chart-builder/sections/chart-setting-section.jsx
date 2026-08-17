import React from 'react';
import {
  RiBarChartGroupedLine,
  RiHashtag,
  RiLineChartLine,
  RiPieChartLine,
  RiTableLine,
} from 'react-icons/ri';

import { BatteryChartTypeIcon } from '@/components/dashboard-master/chart-type-icons';

import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Textarea from '@/components/ui/textarea';
import { cn } from '@/utils/cn';
import SectionCard from './section-card';

const CHART_TYPE_TILES = [
  { id: 'kpi', label: 'KPI Card', icon: RiHashtag, types: ['kpi'] },
  {
    id: 'bar',
    label: 'Bar',
    icon: RiBarChartGroupedLine,
    types: ['vertical_bar', 'horizontal_bar'],
    defaultType: 'vertical_bar',
  },
  { id: 'pie', label: 'Pie', icon: RiPieChartLine, types: ['pie', 'donut'], defaultType: 'pie' },
  { id: 'line', label: 'Line', icon: RiLineChartLine, types: ['line'] },
  { id: 'table', label: 'Table', icon: RiTableLine, types: ['table'] },
  { id: 'battery', label: 'Battery', icon: BatteryChartTypeIcon, types: ['battery'] },
];

function isTileActive(tile, chartType) {
  return tile.types.includes(chartType);
}

export default function ChartSettingSection({
  title,
  summary,
  chartType,
  onTitleChange,
  onSummaryChange,
  onChartTypeChange,
}) {
  return (
    <SectionCard title='Chart Setting' defaultOpen>
      <div className='flex flex-col gap-1'>
        <Label.Root>
          Chart Title
          <Label.Asterisk />
        </Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input
              placeholder='e.g. Sales Overview'
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      <div className='flex flex-col gap-1'>
        <Label.Root>Summary</Label.Root>
        <Textarea.Root
          rows={2}
          placeholder='e.g. About Sales Overview'
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <Label.Root>
          Chart Type
          <Label.Asterisk />
        </Label.Root>
        <div className='grid grid-cols-3 gap-3'>
          {CHART_TYPE_TILES.map((tile) => {
            const isActive = isTileActive(tile, chartType);
            const Icon = tile.icon;
            const isCustomIcon = Icon === BatteryChartTypeIcon;
            return (
              <button
                key={tile.id}
                type='button'
                onClick={() => onChartTypeChange(tile.defaultType ?? tile.types[0])}
                className={cn(
                  'flex h-[77px] flex-col items-center justify-center gap-1 rounded-xl border px-4 transition',
                  isActive
                    ? 'border-primary-base bg-primary-alpha-10 text-text-sub-500'
                    : 'border-stroke-soft-200 bg-bg-white-0 text-text-sub-500 hover:bg-bg-weak-50',
                )}
              >
                {isCustomIcon ? (
                  <Icon className='size-6' active={isActive} />
                ) : (
                  <Icon className={cn('size-6', isActive && 'text-primary-base')} />
                )}
                <span className='label-xsmall text-center leading-4'>{tile.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

export { CHART_TYPE_TILES };
