import React from 'react';
import { Image, View } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import {
  PDF_COLORS,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import {
  PDF_PAGE3_ABOUT,
  PDF_PAGE3_FOOTER,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-layout-config';
import {
  PAGE3_HIGHLIGHT_LAYOUTS,
  PAGE3_PRESENCE_LAYOUTS,
  PAGE3_STAT_LAYOUTS,
} from '@/components/ui/proposal-builder/proposal-template/page-3-layout';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import {
  absBox,
  PdfAccentLine,
  PdfClippedImage,
  PdfHeroBackground,
  PdfMultilineText,
  PdfText,
  resolvePdfAssetUrl,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

/** india-map.png 2398×1349 — visible silhouette bbox y: 71–1260 */
const PAGE3_MAP_SECTION = { top: 539.2, height: 1219.036 };
const PAGE3_MAP_FRAME = { left: 1002.19, width: 1376.358, height: 1201.086 };
const PAGE3_MAP_IMAGE = {
  naturalWidth: 2398,
  naturalHeight: 1349,
  contentCenterY: 665.5,
  displayWidth: 2212.046,
  displayLeft: -408.09,
};

const PAGE3_MAP_IMAGE_SCALE = PAGE3_MAP_IMAGE.displayWidth / PAGE3_MAP_IMAGE.naturalWidth;
const PAGE3_MAP_FRAME_TOP =
  PAGE3_MAP_SECTION.top + (PAGE3_MAP_SECTION.height - PAGE3_MAP_FRAME.height) / 2;
const PAGE3_MAP_IMAGE_TOP =
  PAGE3_MAP_FRAME.height / 2 - PAGE3_MAP_IMAGE.contentCenterY * PAGE3_MAP_IMAGE_SCALE;
const PAGE3_MAP_IMAGE_DISPLAY_HEIGHT = PAGE3_MAP_IMAGE.naturalHeight * PAGE3_MAP_IMAGE_SCALE;

function IconCircle({ src, origin, size, accentColor }) {
  const url = resolvePdfAssetUrl(src, origin);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accentColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <Image src={url} style={{ width: size > 40 ? 32 : 22, height: size > 40 ? 32 : 22 }} />
      ) : null}
    </View>
  );
}

export default function PdfPage3({ content, origin, primaryColor, heroTintColor }) {
  const pageContent = { ...defaultProposalContent.page3, ...content };
  const { heading, spreadTitle, highlights, presencePoints, aboutCity, images } = pageContent;
  const accentColor = primaryColor || PDF_COLORS.primary;

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2552.999, height: 539.197 }}
        image={{ left: 0, top: -200.1, width: 2552.999, height: 1701.999 }}
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

      <View style={absBox(0, 539.2, 2480, 1219.036, { backgroundColor: PDF_COLORS.mapBg })} />

      <PdfMultilineText
        font='inter'
        size={61}
        lineHeight={1.25}
        letterSpacing={-1.28}
        style={absBox(119.22, 677.48, 753.359)}
      >
        {spreadTitle}
      </PdfMultilineText>

      <PdfClippedImage
        src={images.indiaMap}
        origin={origin}
        frame={{
          left: PAGE3_MAP_FRAME.left,
          top: PAGE3_MAP_FRAME_TOP,
          width: PAGE3_MAP_FRAME.width,
          height: PAGE3_MAP_FRAME.height,
        }}
        image={{
          left: PAGE3_MAP_IMAGE.displayLeft,
          top: PAGE3_MAP_IMAGE_TOP,
          width: PAGE3_MAP_IMAGE.displayWidth,
          height: PAGE3_MAP_IMAGE_DISPLAY_HEIGHT,
        }}
      />

      {highlights.map((item, index) => {
        const layout = PAGE3_HIGHLIGHT_LAYOUTS[index];
        if (!layout) return null;

        return (
          <View key={item.id} style={absBox(layout.left, layout.top, layout.width, layout.height)}>
            <View style={absBox(0, 0, layout.iconSize, layout.iconSize)}>
              <IconCircle
                src={item.icon}
                origin={origin}
                size={layout.iconSize}
                accentColor={accentColor}
              />
            </View>
            <PdfText size={layout.valueSize} letterSpacing={-1.2533} style={absBox(82, -9.7)}>
              {item.value}
            </PdfText>
            <PdfText
              size={24.333}
              color={PDF_COLORS.textNavyAlt}
              letterSpacing={-0.5067}
              style={absBox(layout.labelLeft, layout.labelTop)}
            >
              {item.label}
            </PdfText>
            <PdfText
              size={21.667}
              lineHeight={1.22}
              letterSpacing={-0.4533}
              style={absBox(layout.descLeft, layout.descTop, layout.descWidth)}
            >
              {item.description}
            </PdfText>
          </View>
        );
      })}

      {presencePoints.map((item, index) => {
        const layout = PAGE3_PRESENCE_LAYOUTS[index];
        if (!layout) return null;

        return (
          <View key={item.id} style={absBox(layout.left, layout.top, layout.width)}>
            <View style={absBox(0, 0, layout.iconSize, layout.iconSize)}>
              <IconCircle
                src={item.icon}
                origin={origin}
                size={layout.iconSize}
                accentColor={accentColor}
              />
            </View>
            <PdfText
              size={37.667}
              letterSpacing={-0.7733}
              style={absBox(layout.titleLeft, layout.titleTop, layout.titleWidth)}
            >
              {item.title}
            </PdfText>
            <PdfText
              size={20.667}
              lineHeight={1.23}
              letterSpacing={-0.4533}
              style={absBox(layout.descLeft, layout.descTop, layout.descWidth)}
            >
              {item.description}
            </PdfText>
          </View>
        );
      })}

      <PdfText
        font={PDF_PAGE3_ABOUT.title.font}
        size={PDF_PAGE3_ABOUT.title.size}
        color={PDF_PAGE3_ABOUT.title.color}
        lineHeight={PDF_PAGE3_ABOUT.title.lineHeight}
        letterSpacing={PDF_PAGE3_ABOUT.title.letterSpacing}
        style={absBox(
          PDF_PAGE3_ABOUT.title.left,
          PDF_PAGE3_ABOUT.title.top,
          PDF_PAGE3_ABOUT.title.width,
        )}
      >
        {aboutCity.title}
      </PdfText>

      <PdfMultilineText
        font={PDF_PAGE3_ABOUT.subtitle.font}
        size={PDF_PAGE3_ABOUT.subtitle.size}
        color={PDF_PAGE3_ABOUT.subtitle.color}
        letterSpacing={PDF_PAGE3_ABOUT.subtitle.letterSpacing}
        opacity={PDF_PAGE3_ABOUT.subtitle.opacity}
        style={absBox(
          PDF_PAGE3_ABOUT.subtitle.left,
          PDF_PAGE3_ABOUT.subtitle.top,
          PDF_PAGE3_ABOUT.subtitle.width,
        )}
      >
        {aboutCity.subtitle}
      </PdfMultilineText>

      {aboutCity.stats.map((stat, index) => {
        const layout = PAGE3_STAT_LAYOUTS[index];
        if (!layout) return null;
        return (
          <View key={stat.id} style={absBox(layout.left, layout.top)}>
            <View style={absBox(0, 0, layout.iconSize, layout.iconSize)}>
              <IconCircle
                src={stat.icon}
                origin={origin}
                size={layout.iconSize}
                accentColor={accentColor}
              />
            </View>
            <PdfText
              size={24}
              letterSpacing={-0.48}
              style={absBox(layout.titleLeft, layout.titleTop, layout.titleWidth)}
            >
              {stat.title}
            </PdfText>
            <PdfText
              size={layout.valueSize}
              letterSpacing={-1.3241}
              style={absBox(0, layout.valueTop, layout.valueWidth)}
            >
              {stat.value}
            </PdfText>
            <PdfMultilineText
              size={layout.descSize}
              lineHeight={1.23}
              letterSpacing={-0.4744}
              style={absBox(0, layout.descTop, layout.descWidth)}
            >
              {stat.description}
            </PdfMultilineText>
          </View>
        );
      })}

      <View
        style={absBox(
          0,
          PDF_PAGE_HEIGHT - PDF_PAGE3_FOOTER.height,
          PDF_PAGE_WIDTH,
          PDF_PAGE3_FOOTER.height,
          { overflow: 'hidden' },
        )}
      >
        {resolvePdfAssetUrl(images.footerSkyline, origin) ? (
          <Image
            src={resolvePdfAssetUrl(images.footerSkyline, origin)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: PDF_PAGE_WIDTH,
              height: PDF_PAGE3_FOOTER.height,
            }}
          />
        ) : null}
      </View>
    </PdfPageShell>
  );
}
