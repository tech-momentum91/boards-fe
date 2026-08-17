import React, { useCallback } from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import {
  PAGE5_SECTION_KEYS,
  getPage5SectionCssSuffix,
  resolvePage5LayoutId,
  resolvePage5SectionLayout,
} from '@/components/ui/proposal-builder/proposal-template/page-5-gallery-layouts';

function GalleryImage({ wrapStyle, src, alt = '' }) {
  return (
    <div className='proposal-page-5__image-wrap' style={wrapStyle}>
      <img className='proposal-page-5__gallery-image' src={src} alt={alt} draggable={false} />
    </div>
  );
}

function Page5GallerySection({ sectionKey, section, readOnly, onTextChange }) {
  const layoutId = resolvePage5LayoutId(sectionKey, section.layout);
  const layout = resolvePage5SectionLayout(sectionKey, layoutId);
  const suffix = getPage5SectionCssSuffix(sectionKey);

  if (!layout) return null;

  return (
    <>
      <EditableText
        className={`proposal-page-5__section-title proposal-page-5__section-title--${suffix}`}
        element='p'
        value={section.title}
        path={['sections', sectionKey, 'title']}
        onChange={readOnly ? null : onTextChange}
        readOnly={readOnly}
      />
      <div
        className={`proposal-page-5__section-divider proposal-page-5__section-divider--${suffix}`}
        aria-hidden
      />

      {layout.slots.map(({ key, left, top, width, height }) => (
        <GalleryImage
          key={key}
          wrapStyle={{ left, top, width, height }}
          src={section.images?.[key]}
        />
      ))}
    </>
  );
}

export default function Page5({
  content = defaultProposalContent.page5,
  onContentChange,
  readOnly = false,
}) {
  const { heading, sections, images } = content;

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page5', ...path], value);
    },
    [onContentChange],
  );

  return (
    <div className='proposal-page proposal-page--5'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-5__hero-bg-wrap'
        imageClassName='proposal-page-5__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-5__accent-line' aria-hidden />

      <EditableText
        className='proposal-page-5__heading'
        element='p'
        value={heading}
        path={['heading']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      {PAGE5_SECTION_KEYS.map((sectionKey) => (
        <Page5GallerySection
          key={sectionKey}
          sectionKey={sectionKey}
          section={sections[sectionKey]}
          readOnly={readOnly}
          onTextChange={handleTextChange}
        />
      ))}
    </div>
  );
}
