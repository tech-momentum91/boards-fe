import React, { useCallback } from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';
import ProposalHeroBackground from '@/components/ui/proposal-builder/proposal-template/sections/proposal-hero-background';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

export default function Page9({
  content = defaultProposalContent.page9,
  onContentChange,
  readOnly = false,
}) {
  const pageContent = { ...defaultProposalContent.page9, ...content };
  const { title, subtitle, images } = pageContent;

  const handleTextChange = useCallback(
    (path, value) => {
      onContentChange?.(['page9', ...path], value);
    },
    [onContentChange],
  );

  return (
    <div className='proposal-page proposal-page--9'>
      <ProposalHeroBackground
        wrapClassName='proposal-page-9__hero-bg-wrap'
        imageClassName='proposal-page-9__hero-bg'
        src={images.heroBackground}
      />

      <div className='proposal-page-9__logo-wrap'>
        <img className='proposal-page-9__logo' src={images.logo} alt='DevX' draggable={false} />
      </div>

      <EditableText
        className='proposal-page-9__title'
        element='p'
        value={title}
        path={['title']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <EditableText
        className='proposal-page-9__subtitle'
        element='p'
        value={subtitle}
        path={['subtitle']}
        onChange={readOnly ? null : handleTextChange}
        readOnly={readOnly}
        multiline
      />

      <div className='proposal-page-9__gallery-wide-wrap'>
        <img
          className='proposal-page-9__gallery-wide'
          src={images.galleryWide}
          alt=''
          draggable={false}
        />
      </div>

      <div className='proposal-page-9__gallery-left-top-wrap'>
        <img
          className='proposal-page-9__gallery-left-top'
          src={images.galleryLeftTop}
          alt=''
          draggable={false}
        />
      </div>

      <div className='proposal-page-9__gallery-left-bottom-wrap'>
        <img
          className='proposal-page-9__gallery-left-bottom'
          src={images.galleryLeftBottom}
          alt=''
          draggable={false}
        />
      </div>

      <div className='proposal-page-9__gallery-right-wrap'>
        <img
          className='proposal-page-9__gallery-right'
          src={images.galleryRight}
          alt=''
          draggable={false}
        />
      </div>
    </div>
  );
}
