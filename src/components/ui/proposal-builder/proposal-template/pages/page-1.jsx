import React from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

export default function Page1({
  content = defaultProposalContent.page1,
  onContentChange,
  readOnly = false,
}) {
  const { images, title, subtitle } = content;

  const handleTextChange = (path, value) => {
    onContentChange?.(['page1', ...path], value);
  };

  return (
    <div className='proposal-page proposal-page--1'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-1__hero-bg-wrap'
        imageClassName='proposal-page-1__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-1__logo-wrap'>
        <img className='proposal-page-1__logo' src={images.logo} alt='DevX' draggable={false} />
      </div>

      <EditableText
        className='proposal-page-1__title'
        element='p'
        value={title}
        path={['title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <EditableText
        className='proposal-page-1__subtitle'
        element='p'
        value={subtitle}
        path={['subtitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <div className='proposal-page-1__gallery-wide-wrap'>
        <img
          className='proposal-page-1__gallery-wide'
          src={images.galleryWide}
          alt=''
          draggable={false}
        />
      </div>

      <div className='proposal-page-1__gallery-left-top-wrap'>
        <img
          className='proposal-page-1__gallery-left-top'
          src={images.galleryLeftTop}
          alt=''
          draggable={false}
        />
      </div>

      <div className='proposal-page-1__gallery-left-bottom-wrap'>
        <img
          className='proposal-page-1__gallery-left-bottom'
          src={images.galleryLeftBottom}
          alt=''
          draggable={false}
        />
      </div>

      <div className='proposal-page-1__gallery-right-wrap'>
        <img
          className='proposal-page-1__gallery-right'
          src={images.galleryRight}
          alt=''
          draggable={false}
        />
      </div>
    </div>
  );
}
