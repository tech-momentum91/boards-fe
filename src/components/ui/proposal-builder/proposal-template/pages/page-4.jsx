import React, { useCallback } from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import Page4StatCard from '@/components/ui/proposal-builder/proposal-template/sections/page-4-stat-card';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

const HIGHLIGHT_POSITIONS = [
  'proposal-page-4__location--1',
  'proposal-page-4__location--2',
  'proposal-page-4__location--3',
  'proposal-page-4__location--4',
];
const CARD_POSITIONS = [
  'proposal-page-4__neighbor-card--1',
  'proposal-page-4__neighbor-card--2',
  'proposal-page-4__neighbor-card--3',
];

export default function Page4({
  content = defaultProposalContent.page4,
  onContentChange,
  readOnly = false,
}) {
  const {
    heading,
    assetStats,
    locationHighlights,
    neighbors,
    images,
    statsLayout = 'variation-1',
  } = content;
  const isGridLayout = statsLayout === 'variation-3';
  const statSlotPrefix = isGridLayout ? 'grid' : 'row';
  const pageClassName = [
    'proposal-page',
    'proposal-page--4',
    `proposal-page--4-${statsLayout}`,
  ].join(' ');

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page4', ...path], value);
    },
    [onContentChange],
  );

  return (
    <div className={pageClassName} data-stats-layout={statsLayout}>
      <ProposalHeroBackground
        wrapClassName='proposal-page-4__hero-bg-wrap'
        imageClassName='proposal-page-4__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-4__accent-line' aria-hidden />

      <EditableText
        className='proposal-page-4__heading'
        element='p'
        value={heading}
        path={['heading']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      {isGridLayout ? (
        <div className='proposal-page-4__stats-group'>
          {assetStats.map((stat, index) => (
            <Page4StatCard
              key={stat.id}
              stat={stat}
              index={index}
              slot={`${statSlotPrefix}-${index + 1}`}
              readOnly={readOnly}
              onTextChange={handleTextChange}
            />
          ))}
        </div>
      ) : (
        <div className='proposal-page-4__stats-row'>
          {assetStats.map((stat, index) => (
            <Page4StatCard
              key={stat.id}
              stat={stat}
              index={index}
              slot={`${statSlotPrefix}-${index + 1}`}
              readOnly={readOnly}
              onTextChange={handleTextChange}
            />
          ))}
        </div>
      )}

      <div className='proposal-page-4__building-wrap'>
        <img
          className='proposal-page-4__building-image'
          src={images.buildingHero}
          alt='Asset building'
          draggable={false}
        />
      </div>

      {locationHighlights.map((item, index) => (
        <div
          key={item.id}
          className={`proposal-page-4__location ${HIGHLIGHT_POSITIONS[index] ?? ''}`}
        >
          <EditableText
            className='proposal-page-4__location-title'
            element='p'
            value={item.title}
            path={['locationHighlights', index, 'title']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
          />
          <EditableText
            className='proposal-page-4__location-description'
            element='p'
            value={item.description}
            path={['locationHighlights', index, 'description']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
            multiline
          />
        </div>
      ))}

      <div className='proposal-page-4__map-wrap'>
        <img
          className='proposal-page-4__location-map'
          src={images.locationMap}
          alt='Location map'
          draggable={false}
        />
      </div>

      <EditableText
        className='proposal-page-4__neighbors-title'
        element='p'
        value={neighbors.title}
        path={['neighbors', 'title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
      />

      <EditableText
        className='proposal-page-4__neighbors-subtitle'
        element='p'
        value={neighbors.subtitle}
        path={['neighbors', 'subtitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      {neighbors.cards.map((card, index) => (
        <div
          key={card.id}
          className={`proposal-page-4__neighbor-card ${CARD_POSITIONS[index] ?? ''}`}
        >
          <div className='proposal-page-4__neighbor-icon-wrap'>
            <img
              className='proposal-page-4__neighbor-icon'
              src={card.icon}
              alt=''
              draggable={false}
            />
          </div>
          <EditableText
            className='proposal-page-4__neighbor-card-title'
            element='p'
            value={card.title}
            path={['neighbors', 'cards', index, 'title']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
            multiline
          />
          <EditableText
            className='proposal-page-4__neighbor-card-description'
            element='p'
            value={card.description}
            path={['neighbors', 'cards', index, 'description']}
            onChange={readOnly ? null : handleTextChange}
            readOnly={readOnly}
            multiline
          />
        </div>
      ))}
    </div>
  );
}
