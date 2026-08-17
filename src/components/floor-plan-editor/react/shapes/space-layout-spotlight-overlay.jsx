import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Konva from 'konva';
import { Group, Image, Shape } from 'react-konva';

/** Visible blur outside the highlighted space polygon. */
const BLUR_RADIUS = 1000;
/** Light dim on top of blur so non-highlighted areas recede further. */
const DIM_OPACITY = 0.5;

/**
 * Blurs the full floor image and punches a sharp hole over the space polygon.
 * Intended to replace the base floor image ({@link maskReplacesBaseImage}).
 *
 * @param {{
 *   rasterImage: HTMLImageElement,
 *   imageWidth: number,
 *   imageHeight: number,
 *   spotlightPointPairs: number[][],
 * }} props
 */
export function SpaceLayoutSpotlightOverlay({
  rasterImage,
  imageWidth,
  imageHeight,
  spotlightPointPairs = [],
}) {
  const blurImgRef = useRef(null);

  const pairs = useMemo(
    () =>
      spotlightPointPairs.filter(
        (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]),
      ),
    [spotlightPointPairs],
  );

  const clipFunc = useCallback(
    (ctx) => {
      ctx.beginPath();
      pairs.forEach(([nx, ny], idx) => {
        const px = Number(nx) * imageWidth;
        const py = Number(ny) * imageHeight;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
    },
    [pairs, imageWidth, imageHeight],
  );

  const dimSceneFunc = useMemo(() => {
    return (ctx) => {
      ctx.beginPath();
      ctx.rect(0, 0, imageWidth, imageHeight);
      pairs.forEach(([nx, ny], idx) => {
        const px = Number(nx) * imageWidth;
        const py = Number(ny) * imageHeight;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${DIM_OPACITY})`;
      ctx.fill('evenodd');
    };
  }, [pairs, imageWidth, imageHeight]);

  useEffect(() => {
    const node = blurImgRef.current;
    if (!node || !rasterImage || pairs.length < 3) return undefined;

    let cancelled = false;
    const applyBlur = () => {
      if (cancelled || !blurImgRef.current) return;
      const imgNode = blurImgRef.current;
      imgNode.clearCache();
      imgNode.cache();
      imgNode.filters([Konva.Filters.Blur]);
      imgNode.blurRadius(BLUR_RADIUS);
      imgNode.getLayer()?.batchDraw();
    };

    const rafId = requestAnimationFrame(() => requestAnimationFrame(applyBlur));
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [rasterImage, imageWidth, imageHeight, pairs]);

  if (!rasterImage || !imageWidth || !imageHeight || pairs.length < 3) return null;

  return (
    <>
      <Image
        ref={blurImgRef}
        image={rasterImage}
        x={0}
        y={0}
        width={imageWidth}
        height={imageHeight}
        listening={false}
      />
      <Group clipFunc={clipFunc} listening={false}>
        <Image
          image={rasterImage}
          x={0}
          y={0}
          width={imageWidth}
          height={imageHeight}
          listening={false}
        />
      </Group>
      <Shape
        sceneFunc={dimSceneFunc}
        hitFunc={() => {}}
        listening={false}
        perfectDrawEnabled={false}
      />
    </>
  );
}
