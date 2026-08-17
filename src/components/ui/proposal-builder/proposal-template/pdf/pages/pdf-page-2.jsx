import React from 'react';
import { Image, View } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import { PDF_COLORS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import { PDF_PAGE2_FOOTER } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-layout-config';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import {
  absBox,
  PdfAccentLine,
  PdfHeroBackground,
  PdfTable,
  PdfText,
  resolvePdfAssetUrl,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

const FEATURE_CARD_POSITIONS = [
  { left: 125.502, top: 590.341 },
  { left: 125.502, top: 983.341 },
  { left: 875.917, top: 590.341 },
  { left: 875.917, top: 983.341 },
  { left: 1626.186, top: 590.341 },
  { left: 1626.186, top: 983.341 },
];

const FEATURE_ICON_LEFT = [565.617, 565.617, 565.723, 565.723, 566.234, 566.234];

const TABLE_WIDTH = 2235.144;
const TABLE_COL_WIDTHS = [
  TABLE_WIDTH * 0.28,
  (TABLE_WIDTH * 0.72) / 3,
  (TABLE_WIDTH * 0.72) / 3,
  (TABLE_WIDTH * 0.72) / 3,
];

function FeatureCard({ feature, position, iconLeft, origin, accentColor }) {
  const iconUrl = resolvePdfAssetUrl(feature.icon, origin);

  return (
    <View
      style={absBox(position.left, position.top, 724.011, 367.119, {
        backgroundColor: PDF_COLORS.cardBg,
        borderRadius: 16,
      })}
    >
      <PdfText size={38.733} lineHeight={1.17} letterSpacing={-0.6347} style={absBox(61, 84, 395)}>
        {feature.title}
      </PdfText>
      <PdfText
        size={25.624}
        lineHeight={1.23}
        letterSpacing={-0.4325}
        style={absBox(61, 161, 402.76)}
      >
        {feature.description}
      </PdfText>
      <View
        style={absBox(iconLeft, 55.589, 88.798, 88.798, {
          borderRadius: 44.399,
          backgroundColor: accentColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        })}
      >
        {iconUrl ? <Image src={iconUrl} style={{ width: 42, height: 42 }} /> : null}
      </View>
    </View>
  );
}

export default function PdfPage2({ content, origin, primaryColor, heroTintColor }) {
  const pageContent = { ...defaultProposalContent.page2, ...content };
  const { heading, features, comparison, images } = pageContent;
  const accentColor = primaryColor || PDF_COLORS.primary;
  const footerImageUrl = resolvePdfAssetUrl(images.footerImage, origin);

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2557.054, height: 539.197 }}
        image={{ left: 0, top: -200.843, width: 2557.054, height: 1704.703 }}
        tintColor={heroTintColor}
      />

      <PdfAccentLine color={accentColor} />

      <PdfText
        font='inter'
        size={110.333}
        color={PDF_COLORS.white}
        lineHeight={1.25}
        letterSpacing={-2.2667}
        style={absBox(119.22, 190.52, 2174.334)}
      >
        {heading}
      </PdfText>

      {features.map((feature, index) => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          position={FEATURE_CARD_POSITIONS[index]}
          iconLeft={FEATURE_ICON_LEFT[index]}
          origin={origin}
          accentColor={accentColor}
        />
      ))}

      <View
        style={absBox(121.294, 1403.604, 2228.904, 2, {
          borderTopWidth: 2,
          borderTopColor: PDF_COLORS.borderLight,
          borderStyle: 'dashed',
        })}
      />

      <PdfText
        font='inter'
        size={61}
        color='#333333'
        lineHeight={1.25}
        letterSpacing={-1.28}
        style={absBox(118.73, 1456.69, 572.359)}
      >
        {comparison.title}
      </PdfText>

      <PdfText
        size={48.667}
        lineHeight={1}
        letterSpacing={-1.0133}
        opacity={0.87}
        style={absBox(120.89, 1548.82, 2156.111)}
      >
        {comparison.subtitle}
      </PdfText>

      <PdfTable
        left={120.342}
        top={1669.689}
        width={TABLE_WIDTH}
        columns={comparison.columns}
        rows={comparison.rows}
        colWidths={TABLE_COL_WIDTHS}
      />

      <View
        style={absBox(null, null, '100%', null, {
          overflow: 'hidden',
          bottom: 0,
        })}
      >
        {footerImageUrl ? (
          <Image
            src={footerImageUrl}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        ) : null}
      </View>
    </PdfPageShell>
  );
}
