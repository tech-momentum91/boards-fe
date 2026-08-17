import React, { useCallback } from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import {
  PAGE3_HIGHLIGHT_LAYOUTS,
  PAGE3_PRESENCE_LAYOUTS,
  PAGE3_STAT_LAYOUTS,
} from '@/components/ui/proposal-builder/proposal-template/page-3-layout';

export default function Page3({
  content = defaultProposalContent.page3,
  onContentChange,
  readOnly = false,
}) {
  const { heading, spreadTitle, highlights, presencePoints, aboutCity, images } = content;

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page3', ...path], value);
    },
    [onContentChange],
  );

  return (
    <div className='proposal-page proposal-page--3'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-3__hero-bg-wrap'
        imageClassName='proposal-page-3__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-3__accent-line' aria-hidden />

      <EditableText
        className='proposal-page-3__heading'
        element='p'
        value={heading}
        path={['heading']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <div className='proposal-page-3__map-section-bg' aria-hidden />

      <EditableText
        className='proposal-page-3__spread-title'
        element='div'
        value={spreadTitle}
        path={['spreadTitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <div className='proposal-page-3__map-wrap'>
        <img
          className='proposal-page-3__india-map'
          src={images.indiaMap}
          alt='India presence map'
          draggable={false}
        />
      </div>

      {highlights.map((item, index) => {
        const layout = PAGE3_HIGHLIGHT_LAYOUTS[index];
        if (!layout) return null;

        return (
          <div
            key={item.id}
            className='proposal-page-3__highlight'
            style={{ left: layout.left, top: layout.top }}
          >
            <div className='proposal-page-3__icon-circle'>
              <img className='proposal-page-3__icon' src={item.icon} alt='' draggable={false} />
            </div>
            <EditableText
              className='proposal-page-3__highlight-value'
              element='p'
              value={item.value}
              path={['highlights', index, 'value']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
            <EditableText
              className='proposal-page-3__highlight-label'
              element='p'
              value={item.label}
              path={['highlights', index, 'label']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
            <EditableText
              className='proposal-page-3__highlight-description'
              element='p'
              value={item.description}
              path={['highlights', index, 'description']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
              multiline
            />
          </div>
        );
      })}

      {presencePoints.map((item, index) => {
        const layout = PAGE3_PRESENCE_LAYOUTS[index];
        if (!layout) return null;

        return (
          <div key={item.id} className='proposal-page-3__presence' style={{ top: layout.top }}>
            <div className='proposal-page-3__icon-circle'>
              <img className='proposal-page-3__icon' src={item.icon} alt='' draggable={false} />
            </div>
            <EditableText
              className='proposal-page-3__presence-title'
              element='p'
              value={item.title}
              path={['presencePoints', index, 'title']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
            <EditableText
              className='proposal-page-3__presence-description'
              element='p'
              value={item.description}
              path={['presencePoints', index, 'description']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
              multiline
            />
          </div>
        );
      })}

      <EditableText
        className='proposal-page-3__about-title'
        element='p'
        value={aboutCity.title}
        path={['aboutCity', 'title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
      />

      <EditableText
        className='proposal-page-3__about-subtitle'
        element='p'
        value={aboutCity.subtitle}
        path={['aboutCity', 'subtitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      {aboutCity.stats.map((stat, index) => {
        const layout = PAGE3_STAT_LAYOUTS[index];
        if (!layout) return null;

        return (
          <div key={stat.id} className='proposal-page-3__stat' style={{ left: layout.left }}>
            <div className='proposal-page-3__stat-icon-circle'>
              <img
                className='proposal-page-3__stat-icon'
                src={stat.icon}
                alt=''
                draggable={false}
              />
            </div>
            <EditableText
              className='proposal-page-3__stat-title'
              element='p'
              value={stat.title}
              path={['aboutCity', 'stats', index, 'title']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
            <EditableText
              className='proposal-page-3__stat-value'
              element='p'
              value={stat.value}
              path={['aboutCity', 'stats', index, 'value']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
            <EditableText
              className='proposal-page-3__stat-description'
              element='p'
              value={stat.description}
              path={['aboutCity', 'stats', index, 'description']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
              multiline
            />
          </div>
        );
      })}

      <div className='proposal-page-3__footer-wrap'>
        <img
          className='proposal-page-3__footer-image'
          src={images.footerSkyline}
          alt=''
          draggable={false}
        />
      </div>
    </div>
  );
}
