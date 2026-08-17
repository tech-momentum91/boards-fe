import React from 'react';

import * as Switch from '@/components/ui/switch';
import SectionCard from './section-card';

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className='flex items-center justify-between'>
      <span className='paragraph-small text-text-strong-950'>{label}</span>
      <Switch.Root checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function isBarType(chartType) {
  return chartType === 'vertical_bar' || chartType === 'horizontal_bar';
}

function isPieType(chartType) {
  return chartType === 'pie' || chartType === 'donut';
}

export default function DisplaySettingSection({
  chartType,
  showAverage,
  showLegends,
  showDataLabels,
  displayAsStackedArea,
  displayAs100Stacked,
  onChange,
  onChartTypeChange,
}) {
  const renderToggles = () => {
    if (isBarType(chartType)) {
      return (
        <>
          <ToggleRow
            label='Show as column'
            checked={chartType === 'vertical_bar'}
            onChange={(checked) => onChartTypeChange(checked ? 'vertical_bar' : 'horizontal_bar')}
          />
          <ToggleRow
            label='Show Average Line'
            checked={showAverage}
            onChange={(v) => onChange({ showAverage: v })}
          />
          <ToggleRow
            label='Show Data Labels'
            checked={showDataLabels}
            onChange={(v) => onChange({ showDataLabels: v })}
          />
          <ToggleRow
            label='Show Legend'
            checked={showLegends}
            onChange={(v) => onChange({ showLegends: v })}
          />
        </>
      );
    }

    if (isPieType(chartType)) {
      return (
        <>
          <ToggleRow
            label='Display as a donut'
            checked={chartType === 'donut'}
            onChange={(checked) => onChartTypeChange(checked ? 'donut' : 'pie')}
          />
          <ToggleRow
            label='Show Average Line'
            checked={showAverage}
            onChange={(v) => onChange({ showAverage: v })}
          />
          <ToggleRow
            label='Show Data Labels'
            checked={showDataLabels}
            onChange={(v) => onChange({ showDataLabels: v })}
          />
          <ToggleRow
            label='Show Legend'
            checked={showLegends}
            onChange={(v) => onChange({ showLegends: v })}
          />
        </>
      );
    }

    if (chartType === 'line') {
      return (
        <>
          <ToggleRow
            label='Display as stacked area'
            checked={displayAsStackedArea}
            onChange={(v) => onChange({ displayAsStackedArea: v })}
          />
          <ToggleRow
            label='Show Legend'
            checked={showLegends}
            onChange={(v) => onChange({ showLegends: v })}
          />
        </>
      );
    }

    if (chartType === 'battery') {
      return (
        <>
          <ToggleRow
            label='Display as 100% stacked'
            checked={displayAs100Stacked}
            onChange={(v) => onChange({ displayAs100Stacked: v })}
          />
          <ToggleRow
            label='Show Legend'
            checked={showLegends}
            onChange={(v) => onChange({ showLegends: v })}
          />
        </>
      );
    }

    return (
      <ToggleRow
        label='Show Legend'
        checked={showLegends}
        onChange={(v) => onChange({ showLegends: v })}
      />
    );
  };

  return (
    <SectionCard title='Display Setting' defaultOpen>
      {renderToggles()}
    </SectionCard>
  );
}
