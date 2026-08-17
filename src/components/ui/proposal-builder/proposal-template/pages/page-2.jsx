import React, { useCallback } from 'react';

import EditableTable from '@/components/ui/proposal-builder/proposal-template/sections/editable-table';
import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

const FEATURE_CARD_POSITIONS = [
  'proposal-page-2__feature-card--1',
  'proposal-page-2__feature-card--2',
  'proposal-page-2__feature-card--3',
  'proposal-page-2__feature-card--4',
  'proposal-page-2__feature-card--5',
  'proposal-page-2__feature-card--6',
];

export default function Page2({
  content = defaultProposalContent.page2,
  onContentChange,
  readOnly = false,
}) {
  const { heading, features, comparison, images } = content;

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page2', ...path], value);
    },
    [onContentChange],
  );

  const handleAddRow = useCallback(() => {
    const { columns, rows } = comparison;
    const emptyRow = { id: `row-${Date.now()}` };
    columns.forEach((col) => {
      emptyRow[col.key] = '';
    });
    onContentChange?.(['page2', 'comparison', 'rows'], [...rows, emptyRow]);
  }, [comparison, onContentChange]);

  const handleRemoveRow = useCallback(() => {
    if (comparison.rows.length <= 1) return;
    onContentChange?.(['page2', 'comparison', 'rows'], comparison.rows.slice(0, -1));
  }, [comparison.rows, onContentChange]);

  const handleAddColumn = useCallback(() => {
    const newKey = `col${comparison.columns.length + 1}`;
    const nextColumns = [...comparison.columns, { key: newKey, label: 'New column' }];
    const nextRows = comparison.rows.map((row) => ({ ...row, [newKey]: '' }));
    onContentChange?.(['page2', 'comparison'], {
      ...comparison,
      columns: nextColumns,
      rows: nextRows,
    });
  }, [comparison, onContentChange]);

  const handleRemoveColumn = useCallback(() => {
    if (comparison.columns.length <= 2) return;
    const removed = comparison.columns[comparison.columns.length - 1];
    const nextColumns = comparison.columns.slice(0, -1);
    const nextRows = comparison.rows.map((row) => {
      const next = { ...row };
      delete next[removed.key];
      return next;
    });
    onContentChange?.(['page2', 'comparison'], {
      ...comparison,
      columns: nextColumns,
      rows: nextRows,
    });
  }, [comparison, onContentChange]);

  return (
    <div className='proposal-page proposal-page--2'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-2__hero-bg-wrap'
        imageClassName='proposal-page-2__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-2__accent-line' aria-hidden />

      <EditableText
        className='proposal-page-2__heading'
        element='p'
        value={heading}
        path={['heading']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      {features.map((feature, index) => (
        <div
          key={feature.id}
          className={`proposal-page-2__feature-card ${FEATURE_CARD_POSITIONS[index] ?? ''}`}
        >
          <EditableText
            className='proposal-page-2__feature-title'
            element='p'
            value={feature.title}
            path={['features', index, 'title']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
          />
          <EditableText
            className='proposal-page-2__feature-description'
            element='p'
            value={feature.description}
            path={['features', index, 'description']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
            multiline
          />
          <div
            className={`proposal-page-2__feature-icon-wrap proposal-page-2__feature-icon-wrap--${index + 1}`}
          >
            <img
              className='proposal-page-2__feature-icon'
              src={feature.icon}
              alt=''
              draggable={false}
            />
          </div>
        </div>
      ))}

      <div className='proposal-page-2__divider' aria-hidden />

      <EditableText
        className='proposal-page-2__comparison-title'
        element='p'
        value={comparison.title}
        path={['comparison', 'title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
      />

      <EditableText
        className='proposal-page-2__comparison-subtitle'
        element='p'
        value={comparison.subtitle}
        path={['comparison', 'subtitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <EditableTable
        className='proposal-page-2__table'
        columns={comparison.columns}
        rows={comparison.rows}
        basePath={[]}
        onCellChange={
          readOnly
            ? null
            : (path, value) => onContentChange?.(['page2', 'comparison', ...path], value)
        }
        onAddRow={readOnly ? null : handleAddRow}
        onRemoveRow={readOnly ? null : handleRemoveRow}
        onAddColumn={readOnly ? null : handleAddColumn}
        onRemoveColumn={readOnly ? null : handleRemoveColumn}
        readOnly={readOnly}
      />

      <div className='proposal-page-2__footer-wrap'>
        <img
          className='proposal-page-2__footer-image'
          src={images.footerImage}
          alt=''
          draggable={false}
        />
      </div>
    </div>
  );
}
