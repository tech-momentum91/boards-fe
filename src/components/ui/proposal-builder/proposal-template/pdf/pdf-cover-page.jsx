import React from 'react';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import { PDF_COLORS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import { PDF_COVER_LOGO } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-layout-config';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import {
  absBox,
  PdfClippedImage,
  PdfCoverImage,
  PdfHeroBackground,
  PdfMultilineText,
  PdfText,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

/**
 * Shared cover layout for pages 1 and 9 (same Figma frame structure).
 */
export default function PdfCoverPage({
  content,
  pagePrefix = 'page1',
  galleryRadius = 28,
  origin,
  primaryColor,
  heroTintColor = null,
}) {
  const defaults = defaultProposalContent[pagePrefix] ?? defaultProposalContent.page1;
  const pageContent = { ...defaults, ...content };
  const { images } = pageContent;

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2528.666, height: 1550.573 }}
        image={{ left: -70.939, top: -197.346, width: 2621.877, height: 1747.918 }}
        tintColor={heroTintColor}
      />

      <PdfCoverImage src={images.logo} origin={origin} frame={PDF_COVER_LOGO.position} />

      <PdfMultilineText
        font='inter'
        size={122.613}
        color={PDF_COLORS.white}
        lineHeight={1.25}
        letterSpacing={-1.2923}
        style={absBox(158.168, 495.785, 2248.833)}
      >
        {pageContent.title}
      </PdfMultilineText>

      <PdfMultilineText
        size={57.108}
        color={PDF_COLORS.white}
        lineHeight={1.27}
        letterSpacing={-0.1324}
        opacity={0.6}
        style={absBox(169.012, 873, 1877.307)}
      >
        {pageContent.subtitle}
      </PdfMultilineText>

      <PdfClippedImage
        src={images.galleryWide}
        origin={origin}
        borderRadius={galleryRadius}
        frame={{ left: 169.012, top: 1191.822, width: 2157.99, height: 755.501 }}
        image={{ left: 0, top: 0, width: 2157.99, height: 755.501 }}
      />

      <PdfClippedImage
        src={images.galleryLeftTop}
        origin={origin}
        borderRadius={galleryRadius}
        frame={{ left: 169.012, top: 1994.052, width: 1049, height: 667.38 }}
        image={{ left: 0, top: 0, width: 1049, height: 667.38 }}
      />

      <PdfClippedImage
        src={images.galleryLeftBottom}
        origin={origin}
        borderRadius={galleryRadius}
        frame={{ left: 169.012, top: 2708.17, width: 1049, height: 667.38 }}
        image={{ left: 0, top: 0, width: 1049, height: 667.38 }}
      />

      <PdfClippedImage
        src={images.galleryRight}
        origin={origin}
        borderRadius={galleryRadius}
        frame={{ left: 1266.779, top: 1994.052, width: 1060.224, height: 1381.497 }}
        image={{ left: 0, top: 0, width: 1060.224, height: 1381.497 }}
      />
    </PdfPageShell>
  );
}
