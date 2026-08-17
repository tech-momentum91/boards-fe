import React from 'react';
import { Circle, Path, Svg, View } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import { PDF_COLORS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import { PDF_PAGE6_INCLUSIONS_TEXT } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-layout-config';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import {
  absBox,
  PdfAccentLine,
  PdfClippedImage,
  PdfHeroBackground,
  PdfMetricValue,
  PdfText,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

/**
 * METRIC_LAYOUT indexed by data position 0-7.
 * Mirrors Figma absolute positions:
 *   Left  col (x=375): container 880px, label 311px, dash at 311, value at 483 (397px wide)
 *   Right col (x=1412): container 904px, label 444px, dash at 444, value at 616 (288px wide)
 */
const METRIC_LAYOUT = [
  {
    left: 375,
    top: 1547,
    containerW: 880,
    labelSize: 37.667,
    labelWidth: 311,
    dashLeft: 311,
    valueLeft: 483,
    valueWidth: 397,
  }, // 0 Total Area
  {
    left: 375,
    top: 1657,
    containerW: 880,
    labelSize: 37.667,
    labelWidth: 311,
    dashLeft: 311,
    valueLeft: 483,
    valueWidth: 397,
  }, // 1 Model
  {
    left: 1412,
    top: 1657,
    containerW: 904,
    labelSize: 37.667,
    labelWidth: 444,
    dashLeft: 444,
    valueLeft: 616,
    valueWidth: 288,
  }, // 2 Seat Capacity
  {
    left: 1412,
    top: 1766,
    containerW: 904,
    labelSize: 37.667,
    labelWidth: 444,
    dashLeft: 444,
    valueLeft: 616,
    valueWidth: 288,
  }, // 3 Monthly Estimate
  {
    left: 1412,
    top: 1547,
    containerW: 904,
    labelSize: 37.667,
    labelWidth: 444,
    dashLeft: 444,
    valueLeft: 616,
    valueWidth: 288,
  }, // 4 Security Deposit
  {
    left: 375,
    top: 1766,
    containerW: 880,
    labelSize: 37.667,
    labelWidth: 311,
    dashLeft: 311,
    valueLeft: 483,
    valueWidth: 397,
  }, // 5 Tenure
  {
    left: 375,
    top: 1875,
    containerW: 880,
    labelSize: 37.667,
    labelWidth: 311,
    dashLeft: 311,
    valueLeft: 483,
    valueWidth: 397,
  }, // 6 Lock-in
  {
    left: 1412,
    top: 1875,
    containerW: 904,
    labelSize: 37.667,
    labelWidth: 444,
    dashLeft: 444,
    valueLeft: 616,
    valueWidth: 288,
  }, // 7 CapEx Required
];

const CARD_LEFT = 199;
const CARD_TOP = 2222;
const CARD_WIDTH = 1019;
const CARD_GAP = 89;
const CARD_HEADER_HEIGHT = 130;
const CARD_ROW_HEIGHT = 75;
const CARD_BORDER_RADIUS = 32;
const ICON_SIZE = 30;
const ICON_HEADER_SIZE = 48;
const ROW_PADDING_H = 32;
const ROW_PADDING_V = 18;

const INCLUSION_BG = '#f3f8f5';
const EXCLUSION_BG = '#fef5f5';
const INCLUSION_ACCENT = '#02A54B';
const EXCLUSION_ACCENT = '#C0392B';
const CARD_BORDER = '#767576';
const DIVIDER_COLOR = '#DDDDDD';

function PdfCardIcon({ color, size, isCheck }) {
  return (
    <Svg width={size} height={size} viewBox='0 0 48 48' style={{ flexShrink: 0 }}>
      <Circle cx='24' cy='24' r='22.5' stroke={color} strokeWidth='3' fill='none' />
      {isCheck ? (
        <Path
          d='M13 25 L20 32 L35 16'
          stroke={color}
          strokeWidth='3'
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      ) : (
        <Path
          d='M16 16 L32 32 M32 16 L16 32'
          stroke={color}
          strokeWidth='3'
          fill='none'
          strokeLinecap='round'
        />
      )}
    </Svg>
  );
}

function PdfInclusionCard({ left, items, isInclusion, label, accentColor }) {
  const headerBg = isInclusion ? INCLUSION_BG : EXCLUSION_BG;
  const iconColor = isInclusion ? INCLUSION_ACCENT : EXCLUSION_ACCENT;

  const rowCount = items.filter(Boolean).length;
  const cardHeight = CARD_HEADER_HEIGHT + rowCount * CARD_ROW_HEIGHT + 2;

  return (
    <View
      style={absBox(left, CARD_TOP, CARD_WIDTH, cardHeight, {
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: CARD_BORDER_RADIUS,
        overflow: 'hidden',
      })}
    >
      {/* Card header — explicit top radius matches card so background doesn't bleed past corners */}
      <View
        style={{
          height: CARD_HEADER_HEIGHT,
          backgroundColor: headerBg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          borderTopLeftRadius: CARD_BORDER_RADIUS,
          borderTopRightRadius: CARD_BORDER_RADIUS,
          borderBottomWidth: 1,
          borderBottomColor: DIVIDER_COLOR,
        }}
      >
        <PdfCardIcon color={iconColor} size={ICON_HEADER_SIZE} isCheck={isInclusion} />
        <PdfText
          font='dmSans'
          size={48.67}
          color={PDF_COLORS.textDark}
          letterSpacing={-0.7733}
          fontWeight={500}
        >
          {label}
        </PdfText>
      </View>

      {/* Rows */}
      {items.map((item, i) => {
        if (!item) return null;
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingHorizontal: ROW_PADDING_H,
              paddingVertical: ROW_PADDING_V,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: DIVIDER_COLOR,
              gap: 28,
            }}
          >
            <PdfCardIcon color={iconColor} size={ICON_SIZE} isCheck={isInclusion} />
            <PdfText
              font='dmSans'
              size={30}
              color={PDF_COLORS.textDark}
              lineHeight={1.25}
              letterSpacing={-0.64}
              style={{ flex: 1 }}
            >
              {item}
            </PdfText>
          </View>
        );
      })}
    </View>
  );
}

export default function PdfPage6({ content, origin, primaryColor, heroTintColor }) {
  const pageContent = { ...defaultProposalContent.page6, ...content };
  const { heading, floorPlan, metrics, inclusions, images } = pageContent;
  const accentColor = primaryColor || PDF_COLORS.primary;

  const inclusionColKey = inclusions.columns?.[0]?.key ?? 'inclusion';
  const exclusionColKey = inclusions.columns?.[1]?.key ?? 'exclusion';
  const inclusionLabel = inclusions.columns?.[0]?.label ?? 'Inclusions';
  const exclusionLabel = inclusions.columns?.[1]?.label ?? 'Exclusions';

  const inclusionItems = (inclusions.rows ?? [])
    .map((r) => r[inclusionColKey] || '')
    .filter((item) => String(item).trim());
  const exclusionItems = (inclusions.rows ?? [])
    .map((r) => r[exclusionColKey] || '')
    .filter((item) => String(item).trim());

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2520.555, height: 539.197 }}
        image={{ left: 0, top: -194.13, width: 2520.555, height: 1680.37 }}
        tintColor={heroTintColor}
      />

      <PdfAccentLine left={205.53} color={accentColor} />

      <PdfText
        font='inter'
        size={110.333}
        color={PDF_COLORS.white}
        lineHeight={1.25}
        letterSpacing={-2.2667}
        style={absBox(203.46, 187.61, 2180.334)}
      >
        {heading}
      </PdfText>

      {/* Floor plan title */}
      <PdfText
        font='inter'
        size={61}
        lineHeight={1.25}
        letterSpacing={-1.28}
        style={absBox(205.53, 591.81, 278.406)}
      >
        {floorPlan.title}
      </PdfText>

      {/* Floor plan dashed divider */}
      <View
        style={absBox(528.13, 644.59, 1809.95, 2, {
          borderTopWidth: 2,
          borderTopColor: PDF_COLORS.borderLight,
          borderStyle: 'dashed',
        })}
      />

      {/* Floor plan image */}
      <View
        style={absBox(199, 740, 2127, 720, {
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#000000',
          borderRadius: 32,
        })}
      >
        <PdfClippedImage
          src={floorPlan.compositionImage || floorPlan.image}
          origin={origin}
          frame={{ left: 0, top: 0, width: 2125, height: 718 }}
          image={{ left: 0, top: 0, width: 2125, height: 718 }}
          style={{ borderRadius: 32 }}
        />
      </View>

      {/* Metrics outer border box */}
      <View
        style={absBox(199, 1511, 2127, 438, {
          borderWidth: 1,
          borderColor: '#767576',
          borderRadius: 32,
        })}
      />

      {/* Vertical center divider */}
      <View style={absBox(1262, 1511, 1, 438, { backgroundColor: '#767576' })} />

      {/* Three horizontal dividers */}
      <View style={absBox(199, 1621, 2127, 1, { backgroundColor: '#767576' })} />
      <View style={absBox(199, 1730, 2127, 1, { backgroundColor: '#767576' })} />
      <View style={absBox(199, 1839, 2127, 1, { backgroundColor: '#767576' })} />

      {/* Metric cells — absolute positions matching Figma: Label | — | Value */}
      {metrics.map((metric, index) => {
        const layout = METRIC_LAYOUT[index];
        if (!layout) return null;
        const vertOffset = (layout.labelSize - 30) / 2;
        return (
          <View
            key={metric.id}
            style={{ ...absBox(layout.left, layout.top), width: layout.containerW }}
          >
            {/* Label */}
            <PdfText
              size={layout.labelSize}
              color={accentColor}
              letterSpacing={-0.7733}
              fontWeight={500}
              style={{ position: 'absolute', left: 0, top: 0, width: layout.labelWidth }}
            >
              {metric.label}
            </PdfText>
            {/* Dash — positioned at dashLeft, vertically centred against label */}
            <PdfText
              size={30}
              color='#777576'
              style={{ position: 'absolute', left: layout.dashLeft, top: vertOffset }}
            >
              {'—'}
            </PdfText>
            {/* Value — positioned at valueLeft with explicit width to prevent collapse */}
            <PdfMetricValue
              size={30}
              lineHeight={1.24}
              letterSpacing={-0.64}
              value={metric.value}
              origin={origin}
              style={{
                position: 'absolute',
                left: layout.valueLeft,
                top: vertOffset,
                width: layout.valueWidth,
              }}
            />
          </View>
        );
      })}

      {/* Inclusions section heading */}
      <PdfText
        font='inter'
        size={PDF_PAGE6_INCLUSIONS_TEXT.title.fontSize}
        color={PDF_PAGE6_INCLUSIONS_TEXT.title.color}
        lineHeight={1.25}
        letterSpacing={PDF_PAGE6_INCLUSIONS_TEXT.title.letterSpacing}
        fontWeight={400}
        style={absBox(
          PDF_PAGE6_INCLUSIONS_TEXT.title.left,
          PDF_PAGE6_INCLUSIONS_TEXT.title.top,
          PDF_PAGE6_INCLUSIONS_TEXT.title.width,
        )}
      >
        {inclusions.title}
      </PdfText>

      <PdfText
        size={PDF_PAGE6_INCLUSIONS_TEXT.subtitle.fontSize}
        color={PDF_PAGE6_INCLUSIONS_TEXT.subtitle.color}
        letterSpacing={PDF_PAGE6_INCLUSIONS_TEXT.subtitle.letterSpacing}
        opacity={PDF_PAGE6_INCLUSIONS_TEXT.subtitle.opacity}
        fontWeight={400}
        style={absBox(
          PDF_PAGE6_INCLUSIONS_TEXT.subtitle.left,
          PDF_PAGE6_INCLUSIONS_TEXT.subtitle.top,
          PDF_PAGE6_INCLUSIONS_TEXT.subtitle.width,
        )}
      >
        {inclusions.subtitle}
      </PdfText>

      {/* Inclusions card */}
      <PdfInclusionCard
        left={CARD_LEFT}
        items={inclusionItems}
        isInclusion
        label={inclusionLabel}
        accentColor={accentColor}
      />

      {/* Exclusions card */}
      <PdfInclusionCard
        left={CARD_LEFT + CARD_WIDTH + CARD_GAP}
        items={exclusionItems}
        isInclusion={false}
        label={exclusionLabel}
        accentColor={accentColor}
      />
    </PdfPageShell>
  );
}
