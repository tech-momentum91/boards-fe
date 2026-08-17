import React from 'react';
import { Image, View } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import { PDF_COLORS } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import { PDF_PAGE8_FOOTER } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-layout-config';
import PdfPageShell from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-shell';
import {
  absBox,
  PdfAccentLine,
  PdfHeroBackground,
  PdfMultilineText,
  PdfText,
  PdfVideoCard,
  resolvePdfAssetUrl,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

const CATEGORY_STYLES = {
  teal: { bg: PDF_COLORS.tealBg, color: PDF_COLORS.teal },
  navy: { bg: PDF_COLORS.navyBg, color: PDF_COLORS.textNavy },
  green: { bg: PDF_COLORS.greenBg, color: PDF_COLORS.green },
  blue: { bg: PDF_COLORS.blueBg, color: PDF_COLORS.textNavyAlt },
};

const LOGO_POSITIONS = {
  'proposal-page-8__client-logo-wrap--tech-codal': {
    left: 210.79,
    top: 1170.08,
    width: 207.56,
    height: 64.45,
  },
  'proposal-page-8__client-logo-wrap--tech-xebia': {
    left: 559.61,
    top: 1182.74,
    width: 326.58,
    height: 45.12,
  },
  'proposal-page-8__client-logo-wrap--gccs-hitachi': {
    left: 211.22,
    top: 1434.83,
    width: 203.4,
    height: 31.8,
  },
  'proposal-page-8__client-logo-wrap--gccs-rakuten': {
    left: 575.24,
    top: 1425.77,
    width: 197.22,
    height: 58.09,
  },
  'proposal-page-8__client-logo-wrap--enterprise-persistent': {
    left: 206.81,
    top: 1691.2,
    width: 243.3,
    height: 57.28,
  },
  'proposal-page-8__client-logo-wrap--enterprise-horizontal': {
    left: 582.17,
    top: 1686.23,
    width: 140.73,
    height: 71.26,
  },
  'proposal-page-8__client-logo-wrap--enterprise-schneider': {
    left: 845.57,
    top: 1691.2,
    width: 241.2,
    height: 71.15,
  },
  'proposal-page-8__client-logo-wrap--consumer-tim-hortons': {
    left: 208.54,
    top: 1965.83,
    width: 269.44,
    height: 52.91,
  },
  'proposal-page-8__client-logo-wrap--consumer-renee': {
    left: 586.15,
    top: 1962.46,
    width: 163.29,
    height: 59.65,
  },
  'proposal-page-8__client-logo-wrap--consumer-zomato': {
    left: 856.48,
    top: 1968.49,
    width: 227.61,
    height: 47.59,
  },
  'proposal-page-8__client-logo-wrap--consulting-qx-global': {
    left: 211.22,
    top: 2214.04,
    width: 105.44,
    height: 83.24,
  },
  'proposal-page-8__client-logo-wrap--consulting-wipfli': {
    left: 402.28,
    top: 2238.87,
    width: 223.82,
    height: 33.57,
  },
  'proposal-page-8__client-logo-wrap--financial-iex': {
    left: 211.22,
    top: 2542.35,
    width: 143.31,
    height: 44.06,
  },
  'proposal-page-8__client-logo-wrap--financial-state-street': {
    left: 452.12,
    top: 2539.12,
    width: 187.58,
    height: 50.53,
  },
  'proposal-page-8__client-logo-wrap--financial-firstrand': {
    left: 722.27,
    top: 2538.82,
    width: 256.08,
    height: 50.83,
  },
  'proposal-page-8__client-logo-wrap--financial-nse': {
    left: 1061.34,
    top: 2535.64,
    width: 158.8,
    height: 54.01,
  },
};

const TAG_POSITIONS = {
  'proposal-page-8__category-tag-wrap--tech': { left: 206.81, top: 1079.81, width: 109.41 },
  'proposal-page-8__category-tag-wrap--gccs': { left: 211.22, top: 1343.97, width: 115.7 },
  'proposal-page-8__category-tag-wrap--enterprise': { left: 206.01, top: 1605.23, width: 175.34 },
  'proposal-page-8__category-tag-wrap--consumer': { left: 208.54, top: 1867.49, width: 161.57 },
  'proposal-page-8__category-tag-wrap--consulting': { left: 210.79, top: 2133.06, width: 175.34 },
  'proposal-page-8__category-tag-wrap--financial': { left: 210.79, top: 2424.01, width: 255.69 },
};

const STAT_BAR = {
  left: 208.29,
  top: 685.1,
  width: 2023.71,
  height: 215.62,
};

const STAT_DIVIDER = {
  width: 2,
  height: 155.736,
  topOffset: 5.16,
  color: 'rgba(6, 49, 42, 0.35)',
  dashHeight: 6,
  dashGap: 2,
};

/** Dotted vertical rule — mirrors `.proposal-page-8__stats-bar::before` / stat `::before`. */
function PdfPage8StatDivider({ left }) {
  const top = STAT_DIVIDER.topOffset;
  const dashes = [];

  for (let y = 0; y < STAT_DIVIDER.height; y += STAT_DIVIDER.dashHeight + STAT_DIVIDER.dashGap) {
    dashes.push(
      <View
        key={y}
        style={absBox(left, top + y, STAT_DIVIDER.width, STAT_DIVIDER.dashHeight, {
          backgroundColor: STAT_DIVIDER.color,
        })}
      />,
    );
  }

  return <>{dashes}</>;
}

export default function PdfPage8({ content, origin, primaryColor, heroTintColor }) {
  const pageContent = { ...defaultProposalContent.page8, ...content };
  const { heading, stats, categories, testimonials, images } = pageContent;
  const accent = primaryColor || PDF_COLORS.primary;
  const dividersUrl = resolvePdfAssetUrl('/proposal-template/page-8/client-dividers.png', origin);

  return (
    <PdfPageShell>
      <PdfHeroBackground
        src={images.heroBackground}
        origin={origin}
        frame={{ left: 0, top: 0, width: 2593.55, height: 539.2 }}
        image={{ left: 0, top: -207.56, width: 2593.55, height: 1729.04 }}
        tintColor={heroTintColor}
      />

      <PdfAccentLine left={205.53} color={accent} />

      <PdfMultilineText
        font='inter'
        size={110.33}
        color={PDF_COLORS.white}
        lineHeight={1.25}
        letterSpacing={-2.27}
        style={absBox(203.46, 187.61, 2180.334)}
      >
        {heading}
      </PdfMultilineText>

      <View
        style={absBox(STAT_BAR.left, STAT_BAR.top, STAT_BAR.width, STAT_BAR.height, {
          flexDirection: 'row',
        })}
      >
        {stats.map((_, index) => (
          <PdfPage8StatDivider
            key={`divider-${index}`}
            left={(STAT_BAR.width / stats.length) * index}
          />
        ))}

        {stats.map((stat, index) => (
          <View
            key={stat.id}
            style={{
              flex: 1,
              paddingLeft: 35,
            }}
          >
            <PdfText size={30.17} color={PDF_COLORS.textDark}>
              {stat.label}
            </PdfText>
            <PdfText
              size={index === 3 ? 50.67 : 60.67}
              color={PDF_COLORS.textDark}
              style={{ marginTop: 26 }}
            >
              {stat.value}
            </PdfText>
            <PdfText size={22.96} color={PDF_COLORS.textMuted} style={{ marginTop: 14 }}>
              {stat.unit}
            </PdfText>
          </View>
        ))}
      </View>

      {dividersUrl ? (
        <Image src={dividersUrl} style={absBox(210.79, 1295.97, 1098.77, 1063.04)} />
      ) : null}

      {categories.map((category) => {
        const tagPos = TAG_POSITIONS[category.tagWrapClass] ?? { left: 206, top: 1079, width: 120 };
        const tagStyle = CATEGORY_STYLES[category.tagVariant] ?? CATEGORY_STYLES.teal;

        return (
          <React.Fragment key={category.id}>
            <View
              style={absBox(tagPos.left, tagPos.top, tagPos.width, 36, {
                backgroundColor: tagStyle.bg,
                borderRadius: 6,
                paddingHorizontal: 12,
                justifyContent: 'center',
              })}
            >
              <PdfText size={26} color={tagStyle.color}>
                {category.label}
              </PdfText>
            </View>

            {(category.logos ?? []).map((logo) => {
              const pos = LOGO_POSITIONS[logo.positionClass];
              if (!pos) return null;
              const logoUrl = resolvePdfAssetUrl(logo.src, origin);
              if (!logoUrl) return null;

              return (
                <View
                  key={logo.id}
                  style={absBox(pos.left, pos.top, pos.width, pos.height, {
                    justifyContent: 'center',
                    alignItems: 'center',
                  })}
                >
                  <Image
                    src={logoUrl}
                    style={{ width: pos.width, height: pos.height, objectFit: 'contain' }}
                  />
                </View>
              );
            })}
          </React.Fragment>
        );
      })}

      <View
        style={absBox(1379, 996.81, 1146.291, 1797.9, {
          backgroundColor: PDF_COLORS.panelBg,
          paddingTop: 188,
          paddingLeft: 142,
          paddingRight: 64,
        })}
      >
        {testimonials.map((testimonial, index) => (
          <PdfVideoCard
            key={testimonial.id}
            src={testimonial.image}
            href={testimonial.videoUrl}
            origin={origin}
            frame={{
              width: 817.816,
              height: 422.837,
              marginBottom: index < testimonials.length - 1 ? 76 : 0,
            }}
          />
        ))}
      </View>

      {resolvePdfAssetUrl(images.footerOffice, origin) ? (
        <View
          style={absBox(
            PDF_PAGE8_FOOTER.position.left,
            PDF_PAGE8_FOOTER.position.top,
            PDF_PAGE8_FOOTER.position.width,
            PDF_PAGE8_FOOTER.position.height,
            { overflow: 'hidden' },
          )}
        >
          <Image
            src={resolvePdfAssetUrl(images.footerOffice, origin)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: PDF_PAGE8_FOOTER.position.width,
              height: PDF_PAGE8_FOOTER.position.height,
            }}
          />
        </View>
      ) : null}
    </PdfPageShell>
  );
}
