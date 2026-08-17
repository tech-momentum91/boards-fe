import React, { useCallback } from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import ProposalPage6FloorPlan from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import { DEFAULT_PROPOSAL_FLOOR_PLAN_EDITOR_SETTINGS } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-utils';

/**
 * METRIC_POSITIONS maps data array index → CSS position class.
 * Data order: [total-area(0), model(1), seat-capacity(2), monthly-estimate(3),
 *              security-deposit(4), tenure(5), lock-in(6), capex(7)]
 * New 2-column × 4-row grid:
 *   row 1 left=--1  | row 1 right=--2
 *   row 2 left=--3  | row 2 right=--4
 *   row 3 left=--5  | row 3 right=--6
 *   row 4 left=--7  | row 4 right=--8
 */
const METRIC_POSITIONS = [
  'proposal-page-6__metric--1', // 0 Total Area        → left,  row 1
  'proposal-page-6__metric--3', // 1 Model             → left,  row 2
  'proposal-page-6__metric--4', // 2 Seat Capacity     → right, row 2
  'proposal-page-6__metric--6', // 3 Monthly Estimate  → right, row 3
  'proposal-page-6__metric--2', // 4 Security Deposit  → right, row 1
  'proposal-page-6__metric--5', // 5 Tenure            → left,  row 3
  'proposal-page-6__metric--7', // 6 Lock-in           → left,  row 4
  'proposal-page-6__metric--8', // 7 CapEx Required    → right, row 4
];

function InclusionHeaderIcon() {
  return (
    <svg
      width='48'
      height='48'
      viewBox='0 0 48 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='proposal-page-6__inclusions-card-icon'
      aria-hidden
    >
      <circle cx='24' cy='24' r='22.5' stroke='#02A54B' strokeWidth='3' />
      <path
        d='M13 24.5L20.5 32L35 17'
        stroke='#02A54B'
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

function ExclusionHeaderIcon() {
  return (
    <svg
      width='48'
      height='48'
      viewBox='0 0 48 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='proposal-page-6__inclusions-card-icon'
      aria-hidden
    >
      <circle cx='24' cy='24' r='22.5' stroke='#C0392B' strokeWidth='3' />
      <path d='M15 15L33 33M33 15L15 33' stroke='#C0392B' strokeWidth='3' strokeLinecap='round' />
    </svg>
  );
}

function InclusionRowIcon() {
  return (
    <svg
      width='30'
      height='30'
      viewBox='0 0 30 30'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='proposal-page-6__inclusions-card-icon'
      style={{ flexShrink: 0, marginTop: 2 }}
      aria-hidden
    >
      <circle cx='15' cy='15' r='13.5' stroke='#02A54B' strokeWidth='2' />
      <path
        d='M8.5 15.5L12.5 19.5L21.5 10.5'
        stroke='#02A54B'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

function ExclusionRowIcon() {
  return (
    <svg
      width='30'
      height='30'
      viewBox='0 0 30 30'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='proposal-page-6__inclusions-card-icon'
      style={{ flexShrink: 0, marginTop: 2 }}
      aria-hidden
    >
      <circle cx='15' cy='15' r='13.5' stroke='#C0392B' strokeWidth='2' />
      <path d='M10 10L20 20M20 10L10 20' stroke='#C0392B' strokeWidth='2' strokeLinecap='round' />
    </svg>
  );
}

export default function Page6({
  content = defaultProposalContent.page6,
  onContentChange,
  readOnly = false,
  layoutInventory = [],
  embeddedPage6LayoutDetail = null,
  skipLiveLayoutFetch = false,
}) {
  const { heading, floorPlan, metrics, inclusions, images } = content;

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page6', ...path], value);
    },
    [onContentChange],
  );

  const handleAddRow = useCallback(() => {
    const { columns, rows } = inclusions;
    const emptyRow = { id: `row-${Date.now()}` };
    columns.forEach((col) => {
      emptyRow[col.key] = '';
    });
    onContentChange?.(['page6', 'inclusions', 'rows'], [...rows, emptyRow]);
  }, [inclusions, onContentChange]);

  const handleRemoveRow = useCallback(() => {
    if (inclusions.rows.length <= 1) return;
    onContentChange?.(['page6', 'inclusions', 'rows'], inclusions.rows.slice(0, -1));
  }, [inclusions.rows, onContentChange]);

  const handleFloorPlanSave = useCallback(
    (payload) => {
      onContentChange?.(['page6', 'floorPlan'], {
        ...floorPlan,
        customAnnotations: payload.customAnnotations,
        customAnnotationMeta: payload.customAnnotationMeta,
        editorSettings: payload.editorSettings,
        ...(payload.compositionImage
          ? { compositionImage: payload.compositionImage, image: payload.compositionImage }
          : {}),
      });
    },
    [floorPlan, onContentChange],
  );

  const inclusionColKey = inclusions.columns?.[0]?.key ?? 'inclusion';
  const exclusionColKey = inclusions.columns?.[1]?.key ?? 'exclusion';
  const inclusionColLabel = inclusions.columns?.[0]?.label ?? 'Inclusions';
  const exclusionColLabel = inclusions.columns?.[1]?.label ?? 'Exclusions';

  const hasCardItemText = (value) => Boolean(String(value ?? '').trim());

  return (
    <div className='proposal-page proposal-page--6'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-6__hero-bg-wrap'
        imageClassName='proposal-page-6__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-6__accent-line' aria-hidden />

      <EditableText
        className='proposal-page-6__heading'
        element='p'
        value={heading}
        path={['heading']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <EditableText
        className='proposal-page-6__floor-plan-title'
        element='p'
        value={floorPlan.title}
        path={['floorPlan', 'title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
      />
      <div className='proposal-page-6__floor-plan-divider' aria-hidden />

      <div className='proposal-page-6__floor-plan-group'>
        <ProposalPage6FloorPlan
          inventory={layoutInventory}
          embeddedLayoutDetail={embeddedPage6LayoutDetail}
          skipLiveLayoutFetch={skipLiveLayoutFetch}
          customAnnotations={floorPlan.customAnnotations ?? []}
          customAnnotationMeta={floorPlan.customAnnotationMeta ?? null}
          editorSettings={floorPlan.editorSettings ?? DEFAULT_PROPOSAL_FLOOR_PLAN_EDITOR_SETTINGS}
          readOnly={readOnly}
          onFloorPlanSave={readOnly ? null : handleFloorPlanSave}
          fallbackSrc={
            floorPlan.compositionImage ||
            floorPlan.image ||
            '/proposal-template/page-6/floor-plan-composition.png'
          }
        />
      </div>

      {/* Metrics — 2-column × 4-row bordered grid */}
      <div className='proposal-page-6__metrics-frame' aria-hidden />
      <div className='proposal-page-6__metrics-divider-v' aria-hidden />
      <div
        className='proposal-page-6__metrics-divider-h proposal-page-6__metrics-divider-h--1'
        aria-hidden
      />
      <div
        className='proposal-page-6__metrics-divider-h proposal-page-6__metrics-divider-h--2'
        aria-hidden
      />
      <div
        className='proposal-page-6__metrics-divider-h proposal-page-6__metrics-divider-h--3'
        aria-hidden
      />

      {metrics.map((metric, index) => (
        <div key={metric.id} className={`proposal-page-6__metric ${METRIC_POSITIONS[index] ?? ''}`}>
          <EditableText
            className='proposal-page-6__metric-label'
            element='p'
            value={metric.label}
            path={['metrics', index, 'label']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
          />
          <span className='proposal-page-6__metric-dash' aria-hidden>
            —
          </span>
          <EditableText
            className='proposal-page-6__metric-value'
            element='p'
            value={metric.value}
            path={['metrics', index, 'value']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
          />
        </div>
      ))}

      {/* Inclusions section */}
      <EditableText
        className='proposal-page-6__inclusions-title'
        element='p'
        value={inclusions.title}
        path={['inclusions', 'title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
      />

      <EditableText
        className='proposal-page-6__inclusions-subtitle'
        element='p'
        value={inclusions.subtitle}
        path={['inclusions', 'subtitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      {/* Two side-by-side cards: Inclusions | Exclusions */}
      <div className='proposal-page-6__inclusions-cards'>
        {/* Inclusions card */}
        <div className='proposal-page-6__inclusions-card proposal-page-6__inclusions-card--inclusion'>
          <div className='proposal-page-6__inclusions-card-header'>
            <InclusionHeaderIcon />
            <p className='proposal-page-6__inclusions-card-title'>{inclusionColLabel}</p>
          </div>
          {inclusions.rows.map((row, rowIndex) => {
            const value = row[inclusionColKey];
            if (!hasCardItemText(value)) return null;
            return (
              <div key={row.id ?? rowIndex} className='proposal-page-6__inclusions-card-row'>
                <InclusionRowIcon />
                <EditableText
                  className='proposal-page-6__inclusions-card-text'
                  element='p'
                  value={value || ''}
                  path={['inclusions', 'rows', rowIndex, inclusionColKey]}
                  onChange={readOnly ? null : handleTextChange}
                  readOnly={readOnly}
                />
              </div>
            );
          })}
          {!readOnly && (
            <div className='proposal-page-6__inclusions-card-actions'>
              <button
                type='button'
                className='proposal-page-6__inclusions-card-btn'
                onClick={handleAddRow}
                title='Add row'
              >
                +
              </button>
              <button
                type='button'
                className='proposal-page-6__inclusions-card-btn'
                onClick={handleRemoveRow}
                title='Remove last row'
              >
                −
              </button>
            </div>
          )}
        </div>

        {/* Exclusions card */}
        <div className='proposal-page-6__inclusions-card proposal-page-6__inclusions-card--exclusion'>
          <div className='proposal-page-6__inclusions-card-header'>
            <ExclusionHeaderIcon />
            <p className='proposal-page-6__inclusions-card-title'>{exclusionColLabel}</p>
          </div>
          {inclusions.rows.map((row, rowIndex) => {
            const value = row[exclusionColKey];
            if (!hasCardItemText(value)) return null;
            return (
              <div key={row.id ?? rowIndex} className='proposal-page-6__inclusions-card-row'>
                <ExclusionRowIcon />
                <EditableText
                  className='proposal-page-6__inclusions-card-text'
                  element='p'
                  value={value || ''}
                  path={['inclusions', 'rows', rowIndex, exclusionColKey]}
                  onChange={readOnly ? null : handleTextChange}
                  readOnly={readOnly}
                />
              </div>
            );
          })}
          {!readOnly && (
            <div className='proposal-page-6__inclusions-card-actions'>
              <button
                type='button'
                className='proposal-page-6__inclusions-card-btn'
                onClick={handleAddRow}
                title='Add row'
              >
                +
              </button>
              <button
                type='button'
                className='proposal-page-6__inclusions-card-btn'
                onClick={handleRemoveRow}
                title='Remove last row'
              >
                −
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
