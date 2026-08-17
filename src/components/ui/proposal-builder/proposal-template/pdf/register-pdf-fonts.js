import { Font } from '@react-pdf/renderer';

import { GOOGLE_FONT_URLS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-google-fonts';

import './pdf-runtime-setup';

let fontsRegistered = false;

/**
 * Register Inter + DM Sans from Google Fonts for react-pdf.
 * @see https://github.com/diegomura/react-pdf-site/blob/master/docs/fonts.md
 */
export function registerProposalPdfFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  Font.register({
    family: 'Inter',
    fonts: [
      { src: GOOGLE_FONT_URLS.inter[400], fontWeight: 400 },
      { src: GOOGLE_FONT_URLS.inter[600], fontWeight: 600 },
    ],
  });

  Font.register({
    family: 'DM Sans',
    fonts: [
      { src: GOOGLE_FONT_URLS.dmSans[400], fontWeight: 400 },
      { src: GOOGLE_FONT_URLS.dmSans[500], fontWeight: 500 },
      { src: GOOGLE_FONT_URLS.dmSans[600], fontWeight: 600 },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
}
