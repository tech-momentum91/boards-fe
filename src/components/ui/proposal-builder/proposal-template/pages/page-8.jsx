import React, { useCallback } from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

const STAT_POSITIONS = [
  'proposal-page-8__stat--1',
  'proposal-page-8__stat--2',
  'proposal-page-8__stat--3',
  'proposal-page-8__stat--4',
];

const TESTIMONIAL_POSITIONS = [
  'proposal-page-8__testimonial-card--1',
  'proposal-page-8__testimonial-card--2',
  'proposal-page-8__testimonial-card--3',
];

export default function Page8({
  content = defaultProposalContent.page8,
  onContentChange,
  readOnly = false,
}) {
  const pageContent = { ...defaultProposalContent.page8, ...content };
  const { heading, images } = pageContent;
  const stats = Array.isArray(pageContent.stats)
    ? pageContent.stats
    : defaultProposalContent.page8.stats;
  const categories = Array.isArray(pageContent.categories)
    ? pageContent.categories
    : defaultProposalContent.page8.categories;
  const testimonials = Array.isArray(pageContent.testimonials)
    ? pageContent.testimonials
    : defaultProposalContent.page8.testimonials;

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page8', ...path], value);
    },
    [onContentChange],
  );

  return (
    <div className='proposal-page proposal-page--8'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-8__hero-bg-wrap'
        imageClassName='proposal-page-8__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-8__accent-line' aria-hidden />

      <EditableText
        className='proposal-page-8__heading'
        element='p'
        value={heading}
        path={['heading']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <div className='proposal-page-8__stats-bar'>
        {stats.map((stat, index) => (
          <div key={stat.id} className={`proposal-page-8__stat ${STAT_POSITIONS[index] ?? ''}`}>
            <EditableText
              className='proposal-page-8__stat-label'
              element='p'
              value={stat.label}
              path={['stats', index, 'label']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
            <EditableText
              className='proposal-page-8__stat-value'
              element='p'
              value={stat.value}
              path={['stats', index, 'value']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
            <EditableText
              className='proposal-page-8__stat-unit'
              element='p'
              value={stat.unit}
              path={['stats', index, 'unit']}
              onChange={readOnly ? null : handleTextChange}
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>

      <div className='proposal-page-8__clients-layer' aria-hidden={false}>
        <div className='proposal-page-8__client-dividers' aria-hidden>
          <img
            className='proposal-page-8__client-dividers-img'
            src='/proposal-template/page-8/client-dividers.svg'
            alt=''
            draggable={false}
          />
        </div>

        {categories.map((category, categoryIndex) => {
          const defaultCategory = defaultProposalContent.page8.categories[categoryIndex] ?? {};
          const tagWrapClass = category.tagWrapClass ?? defaultCategory.tagWrapClass ?? '';
          const tagVariant = category.tagVariant ?? defaultCategory.tagVariant ?? 'teal';
          const logos = Array.isArray(category.logos) ? category.logos : [];

          return (
            <React.Fragment key={category.id}>
              <div className={`proposal-page-8__category-tag-wrap ${tagWrapClass}`}>
                <EditableText
                  className={`proposal-page-8__category-tag proposal-page-8__category-tag--${tagVariant}`}
                  element='p'
                  value={category.label}
                  path={['categories', categoryIndex, 'label']}
                  onChange={readOnly ? null : handleTextChange}
                  readOnly={readOnly}
                />
              </div>

              {logos.map((logo, logoIndex) => {
                const defaultLogo = defaultCategory.logos?.[logoIndex] ?? {};
                const positionClass = logo.positionClass ?? defaultLogo.positionClass ?? '';

                return (
                  <div
                    key={logo.id}
                    className={`proposal-page-8__client-logo-wrap ${positionClass}`}
                  >
                    <img
                      className='proposal-page-8__client-logo'
                      src={logo.src ?? defaultLogo.src}
                      alt=''
                      draggable={false}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      <div className='proposal-page-8__testimonials-panel'>
        {testimonials.map((testimonial, index) => {
          const card = (
            <>
              <img
                className='proposal-page-8__testimonial-image'
                src={testimonial.image}
                alt=''
                draggable={false}
              />
            </>
          );

          return (
            <div
              key={testimonial.id}
              className={`proposal-page-8__testimonial-card ${TESTIMONIAL_POSITIONS[index] ?? ''}`}
            >
              {testimonial.videoUrl ? (
                <a
                  href={testimonial.videoUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='proposal-page-8__testimonial-link'
                >
                  {card}
                </a>
              ) : (
                card
              )}
            </div>
          );
        })}
      </div>

      <div className='proposal-page-8__footer-wrap'>
        <img
          className='proposal-page-8__footer-image'
          src={images.footerOffice}
          alt=''
          draggable={false}
        />
      </div>
    </div>
  );
}
