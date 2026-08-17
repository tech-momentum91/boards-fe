import React from 'react';
import { Image, View } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import { PDF_COLORS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import {
  getPdfPage4Layout,
  PDF_PAGE4_SHARED_FOOTER,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-4-layout';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import { resolveStatSuperscript } from '@/components/ui/proposal-builder/proposal-template/value-utils';
import {
  absBox,
  PdfAccentLine,
  PdfClippedImage,
  PdfHeroBackground,
  PdfMultilineText,
  PdfText,
  resolvePdfAssetUrl,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

const PDF_PAGE4_VALUE_SUFFIX_SIZE = 22.933;
const PDF_PAGE4_VALUE_GAP = 12;
const PDF_PAGE4_STAT_DIVIDER_HEIGHT = 169.409;
const PDF_PAGE4_STAT_DIVIDER_TOP_OFFSET = 5.62;
const PDF_PAGE4_ROW_VALUE_GAP = 6;

function PdfPage4DashedDivider({ height = PDF_PAGE4_STAT_DIVIDER_HEIGHT, top = 0, left }) {
  const dashHeight = 6;
  const dashGap = 5;
  const dashes = [];

  for (let y = 0; y < height; y += dashHeight + dashGap) {
    dashes.push(
      <View
        key={y}
        style={
          left != null
            ? absBox(left, top + y, 2, dashHeight, { backgroundColor: PDF_COLORS.border })
            : {
                width: 2,
                height: dashHeight,
                backgroundColor: PDF_COLORS.border,
                marginBottom: dashGap,
              }
        }
      />,
    );
  }

  if (left != null) {
    return <>{dashes}</>;
  }

  return <View style={{ width: 2, marginTop: top, flexShrink: 0 }}>{dashes}</View>;
}

function PdfPage4ValueRow({ value, valueSuffix, valueSuperscript, typography }) {
  const valueSize = typography.valueSize;
  const suffixSize = typography.valueSuffixSize ?? PDF_PAGE4_VALUE_SUFFIX_SIZE;
  const superscriptSize = typography.valueSuperscriptSize ?? valueSize * 0.56;
  const suffixMarginTop = (valueSize - suffixSize) * 0.75;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'flex-start',
        minHeight: valueSize,
        justifyContent: 'flex-start',
      }}
    >
      <PdfText
        wrap={false}
        size={valueSize}
        lineHeight={1.1}
        letterSpacing={-1.2533}
        color={PDF_COLORS.textDark}
        style={{ marginRight: valueSuperscript || valueSuffix ? PDF_PAGE4_VALUE_GAP : 0 }}
      >
        {value}
      </PdfText>
      {valueSuperscript ? (
        <PdfText
          wrap={false}
          size={superscriptSize}
          letterSpacing={-0.7018}
          style={{ marginRight: valueSuffix ? PDF_PAGE4_VALUE_GAP : 0 }}
        >
          {valueSuperscript}
        </PdfText>
      ) : null}
      {valueSuffix ? (
        <PdfText
          wrap={false}
          size={suffixSize}
          color='#333333'
          letterSpacing={-0.4587}
          style={{ marginTop: suffixMarginTop }}
        >
          {valueSuffix}
        </PdfText>
      ) : null}
    </View>
  );
}

function PdfPage4StatCard({ stat, typography, contentPaddingLeft = 32 }) {
  const { value, valueSuperscript } = resolveStatSuperscript(stat);
  const labelHeight = typography.labelHeight ?? 34.173;
  const valueSize = typography.valueSize ?? 60.667;
  const sublabelSize = typography.sublabelSize ?? 22.957;
  const hasValueRow = Boolean(stat.valueSuffix || valueSuperscript);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <PdfPage4DashedDivider top={PDF_PAGE4_STAT_DIVIDER_TOP_OFFSET} />
      <View style={{ paddingLeft: contentPaddingLeft, paddingRight: 32, flexShrink: 0 }}>
        <View style={{ height: labelHeight, overflow: 'hidden' }}>
          <PdfText
            wrap={false}
            size={typography.labelSize ?? 30.173}
            lineHeight={1}
            letterSpacing={-0.6035}
          >
            {stat.label}
          </PdfText>
        </View>

        <View style={{ marginTop: PDF_PAGE4_ROW_VALUE_GAP }}>
          {hasValueRow ? (
            <PdfPage4ValueRow
              value={value}
              valueSuffix={stat.valueSuffix}
              valueSuperscript={valueSuperscript}
              typography={typography}
            />
          ) : (
            <PdfText
              wrap={false}
              size={valueSize}
              lineHeight={1.1}
              letterSpacing={-1.2533}
              color={PDF_COLORS.textDark}
            >
              {value}
            </PdfText>
          )}
        </View>

        <View style={{ marginTop: PDF_PAGE4_ROW_VALUE_GAP, flexShrink: 0 }}>
          <PdfText
            wrap={false}
            size={sublabelSize}
            lineHeight={1}
            letterSpacing={-0.4591}
            color={PDF_COLORS.textDark}
          >
            {stat.sublabel}
          </PdfText>
        </View>
      </View>
    </View>
  );
}

function PdfPage4StatsRow({ assetStats, typography, bandGap = 90 }) {
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'nowrap', gap: bandGap, alignItems: 'flex-start' }}
    >
      {assetStats.map((stat, index) => (
        <PdfPage4StatCard key={stat.id} stat={stat} typography={typography[index]} />
      ))}
    </View>
  );
}

function PdfPage4Building({ images, layout, origin }) {
  const url = resolvePdfAssetUrl(images.buildingHero, origin);
  const buildingLayout = layout?.building;
  const wrap = buildingLayout?.wrap;
  if (!url || !wrap) return null;

  const { objectPosition = 'bottom center', image, mode } = buildingLayout;

  if (
    image &&
    Number.isFinite(image.left) &&
    Number.isFinite(image.top) &&
    Number.isFinite(image.width) &&
    Number.isFinite(image.height)
  ) {
    return (
      <View style={absBox(wrap.left, wrap.top, wrap.width, wrap.height, { overflow: 'hidden' })}>
        <Image
          src={url}
          style={{
            position: 'absolute',
            left: image.left,
            top: image.top,
            width: image.width,
            height: image.height,
          }}
        />
      </View>
    );
  }

  const isBottomRight = mode === 'contain-bottom-right' || objectPosition === 'bottom right';

  return (
    <View style={absBox(wrap.left, wrap.top, wrap.width, wrap.height, { overflow: 'hidden' })}>
      <Image
        src={url}
        style={{
          position: 'absolute',
          bottom: 0,
          ...(isBottomRight ? { right: 0 } : { left: 0, right: 0 }),
          width: wrap.width,
          height: wrap.height,
          objectFit: 'contain',
          objectPosition: isBottomRight ? 'bottom right' : 'bottom center',
        }}
      />
    </View>
  );
}

export default function PdfPage4({ content, origin, primaryColor, heroTintColor }) {
  const pageContent = { ...defaultProposalContent.page4, ...content };
  const {
    heading,
    assetStats,
    locationHighlights,
    neighbors,
    images,
    statsLayout = 'variation-1',
  } = pageContent;
  const layout = getPdfPage4Layout(statsLayout);
  const footer = PDF_PAGE4_SHARED_FOOTER;
  const accentColor = primaryColor || PDF_COLORS.primary;

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2550, height: 539.197 }}
        image={{ left: 0, top: -199.55, width: 2550, height: 1700 }}
        tintColor={heroTintColor}
      />

      <PdfAccentLine color={accentColor} />

      <PdfMultilineText
        font='inter'
        size={110.333}
        color={PDF_COLORS.white}
        lineHeight={1.25}
        letterSpacing={-2.2667}
        style={absBox(119.22, 187.61, 1523.866)}
      >
        {heading}
      </PdfMultilineText>

      {layout.type === 'row' ? (
        <View style={absBox(layout.statsRow.left, layout.statsRow.top)}>
          <PdfPage4StatsRow assetStats={assetStats} typography={layout.statTypography} />
        </View>
      ) : layout.type === 'grid' ? (
        assetStats.map((stat, index) => {
          const slot = layout.gridStats[index];
          if (!slot) return null;
          const typography = {
            ...layout.statTypography[index],
            ...(slot.valueSize ? { valueSize: slot.valueSize } : {}),
            ...(slot.sublabelSize ? { sublabelSize: slot.sublabelSize } : {}),
            ...(slot.labelSize ? { labelSize: slot.labelSize } : {}),
          };

          return (
            <View
              key={stat.id}
              style={absBox(layout.statsGroup.left + slot.left, layout.statsGroup.top + slot.top)}
            >
              <PdfPage4StatCard
                stat={stat}
                typography={typography}
                contentPaddingLeft={slot.contentPaddingLeft}
              />
            </View>
          );
        })
      ) : null}

      <PdfPage4Building images={images} layout={layout} origin={origin} />

      {locationHighlights.map((item, index) => {
        const locationLayout = footer.locations[index];
        return (
          <View
            key={item.id}
            style={absBox(
              locationLayout.left,
              locationLayout.top,
              locationLayout.containerWidth ?? locationLayout.titleWidth,
            )}
          >
            <PdfText
              wrap={false}
              size={37.667}
              color={accentColor}
              letterSpacing={-0.7733}
              style={{ width: locationLayout.titleWidth }}
            >
              {item.title}
            </PdfText>
            <PdfText
              size={31}
              color={PDF_COLORS.textMuted}
              lineHeight={1.25}
              letterSpacing={-0.64}
              style={absBox(0, locationLayout.descTop, locationLayout.descWidth)}
            >
              {item.description}
            </PdfText>
          </View>
        );
      })}

      <PdfClippedImage
        src={images.locationMap}
        origin={origin}
        frame={footer.map.frame}
        image={footer.map.image}
      />

      <PdfText
        size={37.667}
        color={PDF_COLORS.textNavy}
        letterSpacing={-0.7733}
        style={absBox(
          footer.neighbors.title.left,
          footer.neighbors.title.top,
          footer.neighbors.title.width,
        )}
      >
        {neighbors.title}
      </PdfText>

      <PdfText
        size={30}
        color={PDF_COLORS.textMuted}
        lineHeight={1.25}
        letterSpacing={-0.64}
        style={absBox(
          footer.neighbors.subtitle.left,
          footer.neighbors.subtitle.top,
          footer.neighbors.subtitle.width,
        )}
      >
        {neighbors.subtitle}
      </PdfText>

      {neighbors.cards.map((card, index) => {
        const iconUrl = resolvePdfAssetUrl(card.icon, origin);
        return (
          <View
            key={card.id}
            style={absBox(
              footer.neighbors.cardLefts[index],
              footer.neighbors.cardTop,
              685.545,
              367.119,
              {
                backgroundColor: PDF_COLORS.cardBg,
                borderRadius: 16,
              },
            )}
          >
            <PdfText
              size={39.733}
              lineHeight={1.17}
              letterSpacing={-0.6347}
              style={absBox(50.58, 65.11, 350.865)}
            >
              {card.title}
            </PdfText>
            <PdfText
              size={25.624}
              lineHeight={1.23}
              letterSpacing={-0.4325}
              style={absBox(50.58, 193.41, 510.836)}
            >
              {card.description}
            </PdfText>
            <View
              style={absBox(555.21, 40.59, 88.798, 88.798, {
                borderRadius: 44.399,
                backgroundColor: accentColor,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              {iconUrl ? <Image src={iconUrl} style={{ width: 42, height: 42 }} /> : null}
            </View>
          </View>
        );
      })}
    </PdfPageShell>
  );
}
