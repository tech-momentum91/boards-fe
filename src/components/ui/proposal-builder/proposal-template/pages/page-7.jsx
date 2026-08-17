import React, { useCallback } from 'react';

import EditableTable from '@/components/ui/proposal-builder/proposal-template/sections/editable-table';
import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

const AMENITY_POSITIONS = [
  'proposal-page-7__amenity-card--1',
  'proposal-page-7__amenity-card--2',
  'proposal-page-7__amenity-card--3',
  'proposal-page-7__amenity-card--4',
  'proposal-page-7__amenity-card--5',
  'proposal-page-7__amenity-card--6',
  'proposal-page-7__amenity-card--7',
  'proposal-page-7__amenity-card--8',
  'proposal-page-7__amenity-card--9',
  'proposal-page-7__amenity-card--10',
  'proposal-page-7__amenity-card--11',
];

export default function Page7({
  content = defaultProposalContent.page7,
  onContentChange,
  readOnly = false,
}) {
  const pageContent = { ...defaultProposalContent.page7, ...content };
  const { heading, terms, images } = pageContent;
  const amenities = Array.isArray(pageContent.amenities)
    ? pageContent.amenities
    : defaultProposalContent.page7.amenities;

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page7', ...path], value);
    },
    [onContentChange],
  );

  const handleAddRow = useCallback(() => {
    const { columns, rows } = terms.table;
    const emptyRow = { id: `row-${Date.now()}` };
    columns.forEach((col) => {
      emptyRow[col.key] = '';
    });
    onContentChange?.(['page7', 'terms', 'table', 'rows'], [...rows, emptyRow]);
  }, [terms.table, onContentChange]);

  const handleRemoveRow = useCallback(() => {
    if (terms.table.rows.length <= 1) return;
    onContentChange?.(['page7', 'terms', 'table', 'rows'], terms.table.rows.slice(0, -1));
  }, [terms.table.rows, onContentChange]);

  const handleAddColumn = useCallback(() => {
    const newKey = `col${terms.table.columns.length + 1}`;
    const nextColumns = [...terms.table.columns, { key: newKey, label: 'New column' }];
    const nextRows = terms.table.rows.map((row) => ({ ...row, [newKey]: '' }));
    onContentChange?.(['page7', 'terms', 'table'], {
      ...terms.table,
      columns: nextColumns,
      rows: nextRows,
    });
  }, [terms.table, onContentChange]);

  const handleRemoveColumn = useCallback(() => {
    if (terms.table.columns.length <= 3) return;
    const removed = terms.table.columns[terms.table.columns.length - 1];
    const nextColumns = terms.table.columns.slice(0, -1);
    const nextRows = terms.table.rows.map((row) => {
      const next = { ...row };
      delete next[removed.key];
      return next;
    });
    onContentChange?.(['page7', 'terms', 'table'], {
      ...terms.table,
      columns: nextColumns,
      rows: nextRows,
    });
  }, [terms.table, onContentChange]);

  return (
    <div className='proposal-page proposal-page--7'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-7__hero-bg-wrap'
        imageClassName='proposal-page-7__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-7__accent-line' aria-hidden />

      <EditableText
        className='proposal-page-7__heading'
        element='p'
        value={heading}
        path={['heading']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <div className='proposal-page-7__amenities-bg' aria-hidden />

      <div className='proposal-page-7__amenities-grid' aria-hidden>
        <div className='proposal-page-7__amenities-grid-line proposal-page-7__amenities-grid-line--h1' />
        <div className='proposal-page-7__amenities-grid-line proposal-page-7__amenities-grid-line--h2' />
        <div className='proposal-page-7__amenities-grid-line proposal-page-7__amenities-grid-line--h3' />
        <div className='proposal-page-7__amenities-grid-line proposal-page-7__amenities-grid-line--v1' />
        <div className='proposal-page-7__amenities-grid-line proposal-page-7__amenities-grid-line--v2' />
      </div>

      {amenities.map((amenity, index) => (
        <div
          key={amenity.id}
          className={`proposal-page-7__amenity-card ${AMENITY_POSITIONS[index] ?? ''}`}
        >
          <div className='proposal-page-7__amenity-icon-wrap'>
            <img
              className='proposal-page-7__amenity-icon'
              src={amenity.icon}
              alt=''
              draggable={false}
            />
          </div>
          <EditableText
            className='proposal-page-7__amenity-title'
            element='p'
            value={amenity.title}
            path={['amenities', index, 'title']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
          />
          <EditableText
            className='proposal-page-7__amenity-description'
            element='p'
            value={amenity.description}
            path={['amenities', index, 'description']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
            multiline
          />
        </div>
      ))}

      <EditableText
        className='proposal-page-7__terms-title'
        element='p'
        value={terms.title}
        path={['terms', 'title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
      />

      <EditableText
        className='proposal-page-7__terms-subtitle'
        element='p'
        value={terms.subtitle}
        path={['terms', 'subtitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <EditableTable
        className='proposal-page-7__terms-table'
        columns={terms.table.columns}
        rows={terms.table.rows}
        basePath={[]}
        onCellChange={
          readOnly
            ? null
            : (path, value) => onContentChange?.(['page7', 'terms', 'table', ...path], value)
        }
        onAddRow={readOnly ? null : handleAddRow}
        onRemoveRow={readOnly ? null : handleRemoveRow}
        onAddColumn={readOnly ? null : handleAddColumn}
        onRemoveColumn={readOnly ? null : handleRemoveColumn}
        readOnly={readOnly}
      />
    </div>
  );
}
