import React from 'react';
import { View } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import {
  PAGE5_SECTION_CHROME,
  PAGE5_SECTION_KEYS,
  resolvePage5LayoutId,
  resolvePage5SectionLayout,
} from '@/components/ui/proposal-builder/proposal-template/page-5-gallery-layouts';

import { PDF_COLORS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import {
  absBox,
  PdfAccentLine,
  PdfCoverImage,
  PdfHeroBackground,
  PdfText,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

export default function PdfPage5({ content, origin, primaryColor, heroTintColor }) {
  const pageContent = { ...defaultProposalContent.page5, ...content };
  const { heading, sections, images } = pageContent;
  const accentColor = primaryColor || PDF_COLORS.primary;

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2540.833, height: 539.197 }}
        image={{ left: 0, top: -197.86, width: 2540.833, height: 1693.888 }}
        tintColor={heroTintColor}
      />

      <PdfAccentLine color={accentColor} />

      <PdfText
        font='inter'
        size={110.333}
        color={PDF_COLORS.white}
        lineHeight={1.25}
        letterSpacing={-2.2667}
        style={absBox(119.22, 187.61, 1523.866)}
      >
        {heading}
      </PdfText>

      {PAGE5_SECTION_KEYS.map((sectionKey) => {
        const sectionContent = sections[sectionKey];
        const layoutId = resolvePage5LayoutId(sectionKey, sectionContent?.layout);
        const layout = resolvePage5SectionLayout(sectionKey, layoutId);
        const chrome = PAGE5_SECTION_CHROME[sectionKey];

        if (!layout) return null;

        return (
          <React.Fragment key={sectionKey}>
            <PdfText
              size={37.667}
              letterSpacing={-0.7733}
              style={absBox(121.36, chrome.titleTop, chrome.titleWidth)}
            >
              {sectionContent.title}
            </PdfText>

            <View
              style={absBox(chrome.divider.left, chrome.divider.top, chrome.divider.width, 2, {
                borderTopWidth: 2,
                borderTopColor: PDF_COLORS.borderLight,
                borderStyle: 'dashed',
              })}
            />

            {layout.slots.map(({ key, left, top, width, height }) => (
              <PdfCoverImage
                key={key}
                src={sectionContent.images?.[key]}
                origin={origin}
                borderRadius={20}
                frame={{ left, top, width, height }}
              />
            ))}
          </React.Fragment>
        );
      })}
    </PdfPageShell>
  );
}
