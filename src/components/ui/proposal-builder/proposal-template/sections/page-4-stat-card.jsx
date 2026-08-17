import React from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import { resolveStatSuperscript } from '@/components/ui/proposal-builder/proposal-template/value-utils';

function Page4StatValue({ stat, index, readOnly, onTextChange }) {
  const { value, valueSuperscript } = resolveStatSuperscript(stat);
  const hasValueRow = Boolean(stat.valueSuffix || valueSuperscript);

  if (!hasValueRow) {
    return (
      <EditableText
        className='proposal-page-4__stat-value'
        element='p'
        value={value}
        path={['assetStats', index, 'value']}
        onChange={readOnly ? null : onTextChange}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className='proposal-page-4__stat-value-row'>
      <EditableText
        className='proposal-page-4__stat-value'
        element='p'
        value={value}
        path={['assetStats', index, 'value']}
        onChange={readOnly ? null : onTextChange}
        readOnly={readOnly}
      />
      {valueSuperscript ? (
        <EditableText
          className='proposal-page-4__stat-value-superscript'
          element='span'
          value={valueSuperscript}
          path={['assetStats', index, 'valueSuperscript']}
          onChange={readOnly ? null : onTextChange}
          readOnly={readOnly}
        />
      ) : null}
      {stat.valueSuffix ? (
        <EditableText
          className='proposal-page-4__stat-value-suffix'
          element='p'
          value={stat.valueSuffix}
          path={['assetStats', index, 'valueSuffix']}
          onChange={readOnly ? null : onTextChange}
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}

/**
 * Shared page-4 stat block: dashed divider + label + value + sublabel.
 * @param {{ stat: object, index: number, slot: string, readOnly?: boolean, onTextChange?: Function }} props
 * slot examples: `row-1` … `row-4`, `grid-1` … `grid-4`
 */
export default function Page4StatCard({ stat, index, slot, readOnly = false, onTextChange }) {
  const cardClassName = [
    'proposal-page-4__stat-card',
    slot ? `proposal-page-4__stat-card--${slot}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClassName}>
      <div className='proposal-page-4__stat-card-divider' aria-hidden />
      <div className='proposal-page-4__stat-card-content'>
        <EditableText
          className='proposal-page-4__stat-label'
          element='p'
          value={stat.label}
          path={['assetStats', index, 'label']}
          onChange={readOnly ? null : onTextChange}
          readOnly={readOnly}
        />
        <Page4StatValue stat={stat} index={index} readOnly={readOnly} onTextChange={onTextChange} />
        <EditableText
          className='proposal-page-4__stat-sublabel'
          element='p'
          value={stat.sublabel}
          path={['assetStats', index, 'sublabel']}
          onChange={readOnly ? null : onTextChange}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
