import React from 'react';
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import { getApiBaseUrl } from '@/api/api-origin';
import { PROPOSAL_PDF_API } from '@/api/proposal-pdf-export';
import { hexToRgba, normHex } from '@/components/ui/proposal-builder/theme/theme-contrast';

import {
  PDF_COLORS,
  PDF_FONTS,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import { normalizePdfText } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-text-utils';

/** Matches web hero tint opacity in proposal-template.css */
export const PDF_HERO_TINT_OPACITY = 0.4;

export const pdfStyles = StyleSheet.create({
  page: {
    width: PDF_PAGE_WIDTH,
    height: PDF_PAGE_HEIGHT,
    position: 'relative',
    backgroundColor: PDF_COLORS.white,
    padding: 0,
  },
  abs: {
    position: 'absolute',
  },
});

/**
 * Resolve image src to an absolute URL react-pdf can fetch.
 */
export function resolvePdfAssetUrl(src, origin) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const apiBase = getApiBaseUrl();

  if (value.startsWith('/api/')) return `${apiBase}${value}`;
  if (value.startsWith('/')) return `${base}${value}`;

  return `${apiBase}${PROPOSAL_PDF_API.proposalImage}?path=${encodeURIComponent(value)}`;
}

export function absBox(left, top, width, height, extra = {}) {
  return {
    position: 'absolute',
    left,
    top,
    ...(width != null ? { width } : {}),
    ...(height != null ? { height } : {}),
    ...extra,
  };
}

/** Clip frame with optional cropped image inside. */
export function PdfClippedImage({
  src,
  frame,
  image,
  origin,
  borderRadius = 0,
  style = {},
  debug = false,
}) {
  const url = resolvePdfAssetUrl(src, origin);
  if (!url) return null;

  return (
    <View
      style={{
        ...absBox(frame.left, frame.top, frame.width, frame.height),
        overflow: 'hidden',
        borderRadius,
      }}
      debug={debug}
    >
      <Image
        src={url}
        style={{
          position: 'absolute',
          left: image?.left ?? 0,
          top: image?.top ?? 0,
          width: image?.width ?? frame.width,
          height: image?.height ?? frame.height,
          ...style,
        }}
        debug={debug}
      />
    </View>
  );
}

/** Full-bleed cover image inside a clip frame. */
export function PdfCoverImage({ src, frame, origin, borderRadius = 0 }) {
  return (
    <PdfClippedImage
      src={src}
      frame={frame}
      image={{ left: 0, top: 0, width: frame.width, height: frame.height }}
      origin={origin}
      borderRadius={borderRadius}
    />
  );
}

export function PdfText({
  children,
  style,
  font = 'dmSans',
  size,
  color = PDF_COLORS.textDark,
  lineHeight,
  letterSpacing,
  opacity,
  fontWeight = 400,
  wrap = true,
  multiline = false,
}) {
  const fontFamily = font === 'inter' ? PDF_FONTS.sans : PDF_FONTS.dmSans;
  const text = normalizePdfText(children);
  return (
    <Text
      wrap={wrap}
      style={{
        fontFamily,
        fontSize: size,
        color,
        lineHeight,
        letterSpacing,
        opacity,
        fontWeight,
        ...style,
      }}
    >
      {text}
    </Text>
  );
}

/** Text that preserves explicit line breaks and normalizes special glyphs. */
export function PdfMultilineText(props) {
  return <PdfText {...props} multiline />;
}

/** Metric / currency values — DM Sans renders U+20B9 (₹) as text. */
export function PdfMetricValue({
  value,
  style,
  size,
  color = PDF_COLORS.textDark,
  font = 'dmSans',
  letterSpacing,
  lineHeight,
  origin: _origin,
}) {
  const fontFamily = font === 'inter' ? PDF_FONTS.sans : PDF_FONTS.dmSans;
  const text = normalizePdfText(value);

  return (
    <Text
      style={{
        fontFamily,
        fontSize: size,
        color,
        letterSpacing,
        lineHeight,
        ...style,
      }}
    >
      {text}
    </Text>
  );
}

export function PdfAccentLine({
  left = 121.29,
  top = 121.91,
  width = 130.31,
  color = PDF_COLORS.primary,
}) {
  return <View style={absBox(left, top, width, 4, { backgroundColor: color })} />;
}

export function PdfHeroBackground({
  src,
  frame,
  image,
  origin,
  tintColor,
  tintOpacity = PDF_HERO_TINT_OPACITY,
}) {
  const url = resolvePdfAssetUrl(src, origin);
  const tintFill = tintColor ? hexToRgba(normHex(tintColor), tintOpacity) : null;
  if (!url && !tintFill) return null;

  return (
    <View
      style={{ ...absBox(frame.left, frame.top, frame.width, frame.height), overflow: 'hidden' }}
    >
      {url ? (
        <Image
          src={url}
          style={{
            position: 'absolute',
            left: image?.left ?? 0,
            top: image?.top ?? 0,
            width: image?.width ?? frame.width,
            height: image?.height ?? frame.height,
          }}
        />
      ) : null}
      {tintFill ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: frame.width,
            height: frame.height,
            backgroundColor: tintFill,
          }}
        />
      ) : null}
    </View>
  );
}

export function PdfTable({
  left,
  top,
  width,
  columns,
  rows,
  colWidths,
  rowMinHeight = 98,
  cellFontSize = 30,
  headerFontSize = 41.67,
  headerTextAlign = 'left',
  headerBackground = PDF_COLORS.tableHeadBg,
  headerColor = PDF_COLORS.textDark,
  headerLetterSpacing,
  headerPaddingVertical = 16,
  headerMinHeight,
  cellTextAlign = 'left',
  cellColor = PDF_COLORS.textDark,
  cellLetterSpacing,
  cellLineHeight,
  cellPaddingVertical = 12,
  cellPaddingHorizontal = 20,
  cellPaddingLeft,
  borderRadius = 32,
}) {
  const widths = colWidths || columns.map(() => width / columns.length);
  const borderStyle = { borderColor: PDF_COLORS.border, borderStyle: 'solid' };
  const resolvedCellPaddingLeft = cellPaddingLeft ?? cellPaddingHorizontal;

  const headerCellStyle = (index) => ({
    width: widths[index],
    minHeight: headerMinHeight,
    paddingTop: headerPaddingVertical,
    paddingBottom: headerPaddingVertical,
    paddingLeft: cellPaddingHorizontal,
    paddingRight: cellPaddingHorizontal,
    justifyContent: 'center',
    alignItems: headerTextAlign === 'center' ? 'center' : 'flex-start',
    borderRightWidth: index < columns.length - 1 ? 1 : 0,
    borderBottomWidth: 1,
    ...borderStyle,
  });

  const bodyCellStyle = (index) => ({
    width: widths[index],
    paddingTop: cellPaddingVertical,
    paddingBottom: cellPaddingVertical,
    paddingLeft: resolvedCellPaddingLeft,
    paddingRight: cellPaddingHorizontal,
    justifyContent: 'center',
    borderRightWidth: index < columns.length - 1 ? 1 : 0,
    borderBottomWidth: 1,
    ...borderStyle,
  });

  const headerTextStyle = {
    width: '100%',
    textAlign: headerTextAlign,
    letterSpacing: headerLetterSpacing,
  };

  const cellTextStyle = {
    width: '100%',
    textAlign: cellTextAlign,
    letterSpacing: cellLetterSpacing,
    lineHeight: cellLineHeight,
  };

  return (
    <View
      style={{
        ...absBox(left, top, width),
        borderRadius,
        borderWidth: 1,
        ...borderStyle,
      }}
    >
      <View style={{ borderRadius, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', backgroundColor: headerBackground }}>
          {columns.map((col, index) => (
            <View key={col.key} style={headerCellStyle(index)}>
              <PdfText size={headerFontSize} color={headerColor} style={headerTextStyle}>
                {col.label}
              </PdfText>
            </View>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View
            key={row.id || rowIndex}
            style={{
              flexDirection: 'row',
              minHeight: rowMinHeight,
            }}
          >
            {columns.map((col, index) => (
              <View key={col.key} style={bodyCellStyle(index)}>
                <PdfText
                  size={cellFontSize}
                  color={cellColor}
                  font='dmSans'
                  lineHeight={cellLineHeight}
                  style={cellTextStyle}
                >
                  {row[col.key] ?? ''}
                </PdfText>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function PdfVideoCard({ src, href, frame, origin, borderRadius = 23 }) {
  const url = resolvePdfAssetUrl(src, origin);
  const cardStyle = {
    width: frame.width,
    height: frame.height,
    marginBottom: frame.marginBottom ?? 0,
    borderRadius,
    overflow: 'hidden',
    position: 'relative',
  };

  const imageNode = url ? (
    <Image src={url} style={{ width: '100%', height: '100%', borderRadius }} />
  ) : (
    <View style={{ width: '100%', height: '100%', backgroundColor: PDF_COLORS.cardBg }} />
  );

  if (href) {
    return (
      <Link src={href} style={cardStyle}>
        {imageNode}
      </Link>
    );
  }

  return <View style={cardStyle}>{imageNode}</View>;
}
