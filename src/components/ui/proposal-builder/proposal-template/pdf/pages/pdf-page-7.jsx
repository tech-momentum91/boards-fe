import React from 'react';
import { Image, View } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import { PDF_COLORS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import {
  absBox,
  PdfAccentLine,
  PdfHeroBackground,
  PdfText,
  resolvePdfAssetUrl,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

const AMENITY_LAYOUT = [
  { left: 209.92, top: 658.42, titleWidth: 316.109, descWidth: 454.043 },
  { left: 959.46, top: 659.69, titleWidth: 282.125, descWidth: 403.249 },
  { left: 1699.52, top: 659.69, titleWidth: 233.859, descWidth: 265.153 },
  { left: 209.92, top: 907.02, titleWidth: 214.109, descWidth: 456.994 },
  { left: 959.46, top: 908.29, titleWidth: 246.516, descWidth: 317.165 },
  { left: 1699.52, top: 908.29, titleWidth: 333.656, descWidth: 302.449 },
  { left: 209.92, top: 1156.28, titleWidth: 246.516, descWidth: 456.994 },
  { left: 959.46, top: 1157.56, titleWidth: 258.531, descWidth: 383.91 },
  { left: 1699.52, top: 1157.56, titleWidth: 241.438, descWidth: 381.599 },
  { left: 209.92, top: 1405.32, titleWidth: 181.594, descWidth: 358.129 },
  { left: 959.46, top: 1406.59, titleWidth: 303.969, descWidth: 250.953 },
];

const GRID_LINES = {
  h: [{ top: 312.82 }, { top: 562.08 }, { top: 811.12 }],
  v: [{ left: 625.3 }, { left: 1365.55 }],
};

const TERMS_TABLE_WIDTH = 2088.93;
const TERMS_COL_WIDTHS = [
  TERMS_TABLE_WIDTH * 0.11,
  TERMS_TABLE_WIDTH * 0.25,
  TERMS_TABLE_WIDTH * 0.64,
];

const TERMS_TABLE_BORDER = {
  borderStyle: 'solid',
  borderColor: PDF_COLORS.border,
};

function termsCellPadding(columnIndex) {
  return {
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: columnIndex === 0 ? 60 : 24,
    paddingRight: 24,
  };
}

function termsCellBorders(columnIndex, columnCount, isHeader, isLastRow) {
  return {
    ...TERMS_TABLE_BORDER,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: columnIndex < columnCount - 1 ? 1 : 0,
    borderBottomWidth: isHeader || !isLastRow ? 1 : 0,
  };
}

function PdfPage7TermsTable({ left, top, width, columns, rows, colWidths }) {
  const columnCount = columns.length;

  return (
    <View
      style={{
        ...absBox(left, top, width),
        ...TERMS_TABLE_BORDER,
        borderWidth: 1,
        borderRadius: 32,
      }}
    >
      <View style={{ borderRadius: 32, overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: PDF_COLORS.tableHeadBg,
            minHeight: 72,
          }}
        >
          {columns.map((col, columnIndex) => (
            <View
              key={col.key}
              style={{
                width: colWidths[columnIndex],
                justifyContent: 'center',
                ...termsCellPadding(columnIndex),
                ...termsCellBorders(columnIndex, columnCount, true, false),
              }}
            >
              <PdfText size={37.667} color={PDF_COLORS.black} letterSpacing={-0.7733}>
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
              minHeight: 92,
            }}
          >
            {columns.map((col, columnIndex) => (
              <View
                key={col.key}
                style={{
                  width: colWidths[columnIndex],
                  justifyContent: 'center',
                  ...termsCellPadding(columnIndex),
                  ...termsCellBorders(
                    columnIndex,
                    columnCount,
                    false,
                    rowIndex === rows.length - 1,
                  ),
                }}
              >
                <PdfText size={30} color={PDF_COLORS.textDark} letterSpacing={-0.64}>
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

export default function PdfPage7({ content, origin, primaryColor, heroTintColor }) {
  const pageContent = { ...defaultProposalContent.page7, ...content };
  const { heading, terms, images } = pageContent;
  const amenities = Array.isArray(pageContent.amenities)
    ? pageContent.amenities
    : defaultProposalContent.page7.amenities;
  const accentColor = primaryColor || PDF_COLORS.primary;

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2565.166, height: 539.197 }}
        image={{ left: 0, top: -202.34, width: 2565.166, height: 1710.11 }}
        tintColor={heroTintColor}
      />

      <PdfAccentLine left={205.53} color={accentColor} />

      <PdfText
        font='inter'
        size={110.333}
        color={PDF_COLORS.white}
        lineHeight={1.25}
        letterSpacing={-2.2667}
        style={absBox(203.46, 187.61, 1523.866)}
      >
        {heading}
      </PdfText>

      <View style={absBox(0, 539.2, 2490, 1138.036, { backgroundColor: PDF_COLORS.white })} />

      <View style={absBox(203.46, 539.7, 2095.392, 1138.036)}>
        {GRID_LINES.h.map((line, index) => (
          <View
            key={`h-${index}`}
            style={absBox(0, line.top, 2095.392, 1, { backgroundColor: PDF_COLORS.border })}
          />
        ))}
        {GRID_LINES.v.map((line, index) => (
          <View
            key={`v-${index}`}
            style={absBox(line.left, 0, 1, 1138.036, { backgroundColor: PDF_COLORS.border })}
          />
        ))}
      </View>

      {amenities.map((amenity, index) => {
        const layout = AMENITY_LAYOUT[index];
        const iconUrl = resolvePdfAssetUrl(amenity.icon, origin);
        if (!layout) return null;

        return (
          <View key={amenity.id} style={absBox(layout.left, layout.top)}>
            <View
              style={absBox(0, 0, 49.8, 49.8, {
                borderRadius: 24.9,
                backgroundColor: accentColor,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              {iconUrl ? <Image src={iconUrl} style={{ width: 22, height: 22 }} /> : null}
            </View>
            <PdfText
              size={37.667}
              color={accentColor}
              letterSpacing={-0.7733}
              style={absBox(78.06, 1.78, layout.titleWidth)}
            >
              {amenity.title}
            </PdfText>
            <PdfText
              size={31}
              lineHeight={1.24}
              letterSpacing={-0.64}
              style={absBox(78.06, 61.88, layout.descWidth)}
            >
              {amenity.description}
            </PdfText>
          </View>
        );
      })}

      <PdfText
        font='inter'
        size={61}
        lineHeight={1.25}
        letterSpacing={-1.28}
        style={absBox(208.26, 1766.16, 540.172)}
      >
        {terms.title}
      </PdfText>

      <PdfText
        size={48.667}
        lineHeight={1}
        letterSpacing={-1.0133}
        opacity={0.87}
        style={absBox(209.92, 1857.58, 1653.305)}
      >
        {terms.subtitle}
      </PdfText>

      <PdfPage7TermsTable
        left={209.92}
        top={2006.45}
        width={TERMS_TABLE_WIDTH}
        columns={terms.table.columns}
        rows={terms.table.rows}
        colWidths={TERMS_COL_WIDTHS}
      />
    </PdfPageShell>
  );
}
