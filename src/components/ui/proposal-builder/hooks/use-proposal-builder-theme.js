import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildProposalBrandJson,
  getProposalPresentationTheme,
  getProposalThemeFromWebsite,
  hasPersistedProposalBrand,
  logoDisplaySrc,
  parseProposalBrandJson,
  saveCrmProposalBrand,
} from '@/api/crmProposals';
import {
  buildPublicationThemeVarsFromScheme,
  resolveActiveColorScheme,
} from '@/components/ui/proposal-builder/theme/publication-theme-vars';
import {
  buildCombinedPaletteScheme,
  buildDevxCombinedScheme,
  buildDevxPalette,
  DEVX_BRAND_ANCHORS,
  normHex,
  PROPOSAL_PRIMARY_COLOR,
} from '@/components/ui/proposal-builder/theme/theme-contrast';
import { isValidWebsiteUrl, normalizeWebsiteUrl } from '@/utils/url-utils';

const DEVX_PRIMARY = DEVX_BRAND_ANCHORS[0];

function mapColorThemeToSource(colorTheme, hasWebsite) {
  if (colorTheme === 'Client(ai)' && hasWebsite) return 'client';
  return 'devx';
}

function paletteFromBrand(brand) {
  return (brand?.palette ?? []).map(normHex).filter(Boolean).slice(0, 4);
}

function logosFromBrand(brand) {
  return Array.isArray(brand?.logoCandidates) ? brand.logoCandidates.filter((c) => c && c.url) : [];
}

/**
 * Brand theme + logo for publication deck. Loads from CRM Proposal.brand_json when present.
 */
export function useProposalBuilderTheme({
  websiteUrl = '',
  colorTheme = 'DevX',
  persistedBrand = null,
  persistedLogoUrl = null,
  persistedPalette = [],
  persistedCombinedScheme = null,
  proposalId = null,
  readOnly = false,
} = {}) {
  const brand = useMemo(() => parseProposalBrandJson(persistedBrand), [persistedBrand]);
  const normalizedWebsite = useMemo(() => normalizeWebsiteUrl(websiteUrl), [websiteUrl]);
  const hasWebsite = isValidWebsiteUrl(normalizedWebsite);
  const brandCached = hasPersistedProposalBrand(brand, normalizedWebsite);

  const [themeSource, setThemeSourceState] = useState(() =>
    brand?.themeSource === 'client'
      ? 'client'
      : brand?.themeSource === 'devx'
        ? 'devx'
        : mapColorThemeToSource(colorTheme, hasWebsite),
  );
  const [themeColor, setThemeColor] = useState(() => {
    if (brand?.themeSource === 'devx') {
      return normHex(brand.themeColor || brand.palette?.[0]) || DEVX_PRIMARY;
    }
    if (brandCached) return normHex(brand.themeColor || brand.palette?.[0]) || DEVX_PRIMARY;
    return persistedPalette[0] ? normHex(persistedPalette[0]) : DEVX_PRIMARY;
  });
  const [websitePalette, setWebsitePalette] = useState(() => {
    if (brand?.themeSource === 'devx') return buildDevxPalette();
    if (brandCached) return paletteFromBrand(brand);
    if (mapColorThemeToSource(colorTheme, hasWebsite) === 'devx') {
      return buildDevxPalette();
    }
    return persistedPalette.map(normHex).filter(Boolean).slice(0, 4);
  });
  const [websiteCombinedScheme, setWebsiteCombinedScheme] = useState(() => {
    if (brand?.themeSource === 'devx') {
      return brand.combinedScheme ?? buildDevxCombinedScheme(brand.themeColor);
    }
    if (brandCached) return brand.combinedScheme ?? persistedCombinedScheme;
    return persistedCombinedScheme;
  });
  const [clientLogoUrl, setClientLogoUrl] = useState(() => {
    if (brandCached) return brand.selectedLogoUrl || persistedLogoUrl || null;
    return persistedLogoUrl || null;
  });
  const [logoCandidates, setLogoCandidates] = useState(() => {
    if (brandCached) return logosFromBrand(brand);
    return [];
  });
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeToast, setThemeToast] = useState('');
  const seededWebsiteRef = useRef(brandCached ? normalizedWebsite : null);
  const clientThemeSnapshotRef = useRef(null);

  useEffect(() => {
    if (themeSource !== 'client') return;
    const palette = websitePalette.map(normHex).filter(Boolean).slice(0, 4);
    if (palette.length === 0) return;
    clientThemeSnapshotRef.current = {
      palette,
      combinedScheme: websiteCombinedScheme,
      themeColor: normHex(themeColor) || palette[0],
    };
  }, [themeSource, websitePalette, websiteCombinedScheme, themeColor]);

  useEffect(() => {
    if (!brandCached) return;
    setWebsitePalette(paletteFromBrand(brand));
    setWebsiteCombinedScheme(brand.combinedScheme ?? null);
    setLogoCandidates(logosFromBrand(brand));
    setThemeColor(normHex(brand.themeColor || brand.palette?.[0]) || DEVX_PRIMARY);
    setThemeSourceState(brand.themeSource === 'client' ? 'client' : 'devx');
    seededWebsiteRef.current = normalizedWebsite;
  }, [brand, brandCached, normalizedWebsite]);

  useEffect(() => {
    if (brandCached) {
      setClientLogoUrl(persistedLogoUrl ?? brand?.selectedLogoUrl ?? null);
      return;
    }
    setClientLogoUrl(persistedLogoUrl ?? null);
  }, [brandCached, brand?.selectedLogoUrl, persistedLogoUrl]);

  useEffect(() => {
    if (brandCached || themeSource !== 'client') return;
    if (persistedPalette?.length) {
      setWebsitePalette(persistedPalette.map(normHex).filter(Boolean).slice(0, 4));
      setThemeColor(normHex(persistedPalette[0]) || DEVX_PRIMARY);
    }
    if (persistedCombinedScheme) {
      setWebsiteCombinedScheme(persistedCombinedScheme);
    }
  }, [brandCached, persistedPalette, persistedCombinedScheme, themeSource]);

  const persistBrandSnapshot = useCallback(
    async (snapshot) => {
      if (!proposalId || readOnly || !snapshot) return;
      try {
        await saveCrmProposalBrand(proposalId, snapshot);
      } catch {
        /* non-blocking */
      }
    },
    [proposalId, readOnly],
  );

  const applyScrapedLogos = useCallback((themeRes) => {
    const scraped = Array.isArray(themeRes?.logo_candidates)
      ? themeRes.logo_candidates.filter((c) => c && c.url)
      : [];
    setLogoCandidates((prev) => {
      const uploaded = prev.filter((c) => c.source === 'upload' || c.url?.startsWith('data:'));
      const merged = [...scraped];
      uploaded.forEach((item) => {
        if (!merged.some((c) => c.url === item.url)) merged.push(item);
      });
      return merged;
    });

    if (scraped.length > 1) {
      setClientLogoUrl(null);
      setThemeToast(`Found ${scraped.length} logos — pick one for the cover.`);
      return scraped;
    }
    if (scraped.length === 1) {
      setClientLogoUrl(scraped[0].url);
      return scraped;
    }
    if (themeRes?.logo_url) {
      setClientLogoUrl(themeRes.logo_url);
      return scraped;
    }
    if (themeRes?.clientLogoUrl) {
      setClientLogoUrl(logoDisplaySrc(themeRes.clientLogoUrl));
      return scraped;
    }
    setClientLogoUrl((current) => (current?.startsWith('data:') ? current : null));
    return scraped;
  }, []);

  const applyThemeResponse = useCallback(
    (themeRes, presCombined) => {
      const palette = Array.isArray(themeRes?.palette)
        ? themeRes.palette.map(normHex).filter(Boolean)
        : themeRes?.primary
          ? [normHex(themeRes.primary)]
          : themeRes?.color
            ? [normHex(themeRes.color)]
            : [];

      if (palette.length === 0) return null;

      setWebsitePalette(palette.slice(0, 4));
      setThemeColor(palette[0]);
      const logos = applyScrapedLogos(themeRes);

      const combined =
        presCombined && typeof presCombined === 'object'
          ? presCombined
          : buildCombinedPaletteScheme(palette);
      setWebsiteCombinedScheme(combined);

      return {
        palette: palette.slice(0, 4),
        combinedScheme: combined,
        logoCandidates: logos,
        selectedLogoUrl: logos.length === 1 ? logos[0].url : null,
      };
    },
    [applyScrapedLogos],
  );

  useEffect(() => {
    if (themeSource !== 'client' || !hasWebsite) {
      setThemeLoading(false);
      return undefined;
    }

    if (brandCached || seededWebsiteRef.current === normalizedWebsite) {
      return undefined;
    }

    let cancelled = false;

    const loadClientTheme = async () => {
      setThemeLoading(true);
      try {
        const themeRes = await getProposalThemeFromWebsite(normalizedWebsite);
        if (cancelled) return;

        if (themeRes?.theme_scraped === false) {
          setThemeSourceState('devx');
          setThemeColor(DEVX_PRIMARY);
          setWebsitePalette(buildDevxPalette());
          setWebsiteCombinedScheme(buildDevxCombinedScheme(DEVX_PRIMARY));
          setClientLogoUrl(null);
          setLogoCandidates([]);
          setThemeToast('Could not load client brand colors. Using DevX theme.');
          return;
        }

        const pres = await getProposalPresentationTheme({ anchors: themeRes.palette ?? [] });
        if (cancelled) return;

        const combined = pres?.combined_scheme || pres?.combinedScheme || pres?.scheme || null;
        const applied = applyThemeResponse(themeRes, combined);
        if (!applied) {
          setThemeSourceState('devx');
          setThemeColor(DEVX_PRIMARY);
          setWebsitePalette(buildDevxPalette());
          setWebsiteCombinedScheme(buildDevxCombinedScheme(DEVX_PRIMARY));
          setClientLogoUrl(null);
          setLogoCandidates([]);
          setThemeToast('Could not load client brand colors. Using DevX theme.');
          return;
        }

        seededWebsiteRef.current = normalizedWebsite;

        const snapshot = buildProposalBrandJson({
          websiteUrl: normalizedWebsite,
          themeSource: 'client',
          websitePalette: applied.palette,
          websiteCombinedScheme: applied.combinedScheme,
          logoCandidates: applied.logoCandidates,
          clientLogoUrl: applied.selectedLogoUrl,
          themeColor: applied.palette[0],
        });
        await persistBrandSnapshot(snapshot);
      } catch {
        if (!cancelled) {
          setThemeSourceState('devx');
          setThemeColor(DEVX_PRIMARY);
          setWebsitePalette(buildDevxPalette());
          setWebsiteCombinedScheme(buildDevxCombinedScheme(DEVX_PRIMARY));
          setClientLogoUrl(null);
          setLogoCandidates([]);
          setThemeToast('Client theme unavailable. Using DevX theme.');
        }
      } finally {
        if (!cancelled) setThemeLoading(false);
      }
    };

    loadClientTheme();

    return () => {
      cancelled = true;
    };
  }, [
    normalizedWebsite,
    hasWebsite,
    themeSource,
    brandCached,
    applyThemeResponse,
    persistBrandSnapshot,
  ]);

  useEffect(() => {
    if (!themeToast) return undefined;
    const t = window.setTimeout(() => setThemeToast(''), 8000);
    return () => window.clearTimeout(t);
  }, [themeToast]);

  const effectiveThemeSource = useMemo(() => {
    if (themeSource !== 'client') return 'devx';
    if (themeLoading) return 'client';
    if (!hasWebsite) return 'devx';
    if (websiteCombinedScheme || websitePalette.length > 0) return 'client';
    return 'devx';
  }, [themeSource, hasWebsite, websiteCombinedScheme, websitePalette, themeLoading]);

  /** Same 4-color array for controls + publication — DevX anchors or client scrape. */
  const colorPalette = useMemo(() => {
    if (effectiveThemeSource === 'devx') {
      return buildDevxPalette();
    }
    return websitePalette;
  }, [effectiveThemeSource, websitePalette]);

  const activeColorScheme = useMemo(
    () =>
      resolveActiveColorScheme({
        themeSource: effectiveThemeSource,
        themeColor,
        websitePalette: colorPalette,
        websiteCombinedScheme:
          effectiveThemeSource === 'devx'
            ? buildDevxCombinedScheme(themeColor)
            : websiteCombinedScheme,
      }),
    [effectiveThemeSource, themeColor, colorPalette, websiteCombinedScheme],
  );

  const publicationThemeVars = useMemo(
    () => buildPublicationThemeVarsFromScheme(activeColorScheme, colorPalette),
    [activeColorScheme, colorPalette],
  );

  const restoreClientTheme = useCallback(() => {
    if (brandCached && brand) {
      const palette = paletteFromBrand(brand);
      setWebsitePalette(palette);
      setWebsiteCombinedScheme(brand.combinedScheme ?? persistedCombinedScheme ?? null);
      setThemeColor(normHex(brand.themeColor || palette[0]) || DEVX_PRIMARY);
      return;
    }

    const snapshot = clientThemeSnapshotRef.current;
    if (snapshot?.palette?.length) {
      setWebsitePalette(snapshot.palette);
      setWebsiteCombinedScheme(snapshot.combinedScheme ?? null);
      setThemeColor(snapshot.themeColor || normHex(snapshot.palette[0]) || DEVX_PRIMARY);
      return;
    }

    if (persistedPalette?.length) {
      const palette = persistedPalette.map(normHex).filter(Boolean).slice(0, 4);
      setWebsitePalette(palette);
      setThemeColor(normHex(persistedPalette[0]) || DEVX_PRIMARY);
      if (persistedCombinedScheme) {
        setWebsiteCombinedScheme(persistedCombinedScheme);
      }
    }
  }, [brand, brandCached, persistedCombinedScheme, persistedPalette]);

  const setThemeSource = useCallback(
    (source) => {
      setThemeSourceState(source);
      if (source === 'devx') {
        const palette = buildDevxPalette();
        setThemeColor(palette[0]);
        setWebsitePalette(palette);
        setWebsiteCombinedScheme(buildDevxCombinedScheme(palette[0]));
        return;
      }
      if (source === 'client') {
        restoreClientTheme();
      }
    },
    [restoreClientTheme],
  );

  const setThemeColorAndPalette = useCallback(
    (color) => {
      if (effectiveThemeSource === 'devx') {
        const palette = buildDevxPalette();
        const picked = palette.includes(normHex(color)) ? normHex(color) : palette[0];
        setThemeColor(picked);
        setWebsitePalette(palette);
        setWebsiteCombinedScheme(buildDevxCombinedScheme(picked));
        return;
      }
      setThemeColor(color);
    },
    [effectiveThemeSource],
  );

  const buildBrandJson = useCallback(
    () =>
      buildProposalBrandJson({
        websiteUrl: normalizedWebsite,
        themeSource: themeSource === 'client' ? 'client' : 'devx',
        websitePalette: colorPalette,
        websiteCombinedScheme:
          themeSource === 'devx' ? buildDevxCombinedScheme(themeColor) : websiteCombinedScheme,
        logoCandidates,
        clientLogoUrl,
        themeColor,
      }),
    [
      normalizedWebsite,
      themeSource,
      colorPalette,
      themeColor,
      websiteCombinedScheme,
      logoCandidates,
      clientLogoUrl,
    ],
  );

  const selectLogoCandidate = useCallback((rawUrl) => {
    if (!rawUrl) return;
    setClientLogoUrl(rawUrl);
  }, []);

  const uploadClientLogo = useCallback((dataUrl, meta) => {
    if (meta?.error) {
      setThemeToast(meta.error);
      return;
    }
    if (!dataUrl) return;
    setClientLogoUrl(dataUrl);
    setLogoCandidates((prev) => {
      if (prev.some((c) => c.url === dataUrl)) return prev;
      return [...prev, { url: dataUrl, label: 'Uploaded', source: 'upload' }];
    });
  }, []);

  return {
    themeSource,
    setThemeSource,
    themeColor: PROPOSAL_PRIMARY_COLOR,
    setThemeColor: setThemeColorAndPalette,
    websitePalette: colorPalette,
    clientLogoUrl,
    setClientLogoUrl,
    logoCandidates,
    selectLogoCandidate,
    uploadClientLogo,
    buildBrandJson,
    effectiveThemeSource,
    publicationThemeVars,
    themeLoading,
    themeToast,
    hasWebsite,
    /* Dynamic themeColor (disabled):
    themeColor,
    */
  };
}
