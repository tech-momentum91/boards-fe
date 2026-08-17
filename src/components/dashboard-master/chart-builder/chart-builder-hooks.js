import { useCallback, useEffect, useRef, useState } from 'react';

import {
  buildChatbotChartPayload,
  getAxisDoctypes,
  getAxisFieldsForDoctype,
  getChatbotChartTypes,
  getChatbotXAxisOptions,
  getChatbotYAxisOptions,
  previewChatbotChart,
  resolvePreviewChartType,
  transformChatbotResponseToChartData,
} from '@/services/chatbot-chart-service';

/** Load supported chart types (bar/line/pie/donut/kpi/…). */
export function useChartTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getChatbotChartTypes()
      .then((rows) => {
        if (!cancelled) setTypes(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { types, loading };
}

/**
 * Two-step doctype→field axis picker hook.
 *
 * Step 1: loads a list of registered doctypes (with eligible field counts) as
 *         soon as chartType is known — typically 20-30 rows.
 * Step 2: when the user drills into a doctype, `loadFieldsForDoctype(dt)` fetches
 *         that doctype's fields on demand and caches them to avoid re-fetching.
 *
 * @param {string} chartType  e.g. 'vertical_bar', 'line', 'pie'
 * @param {'x'|'y'|'group'} axisType
 * @param {string | null} scopeDoctype  When set (line chart group-by), limit to this DocType.
 */
export function useDoctypeAxisPicker(chartType, axisType, scopeDoctype = null) {
  const [doctypes, setDoctypes] = useState([]);
  const [doctypesLoading, setDoctypesLoading] = useState(false);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // Per-doctype field cache so clicking back and re-entering is instant.
  const fieldCache = useRef({});
  const latestFieldsDoctypeRef = useRef(null);

  // Load doctypes whenever chartType, axisType, or scope changes.
  useEffect(() => {
    if (!chartType || !axisType) return undefined;
    let cancelled = false;
    setDoctypes([]);
    setDoctypesLoading(true);
    getAxisDoctypes({ axisType, chartType, scopeDoctype })
      .then((rows) => {
        if (!cancelled) setDoctypes(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDoctypesLoading(false);
      });
    // Reset field cache on chart/axis type change.
    fieldCache.current = {};
    setFields([]);
    return () => {
      cancelled = true;
    };
  }, [chartType, axisType, scopeDoctype]);

  /**
   * Fetch (or return cached) fields for a given doctype.
   * Updates `fields` and `fieldsLoading` state.
   * @param {string|null} doctype  Pass null to clear.
   */
  const loadFieldsForDoctype = useCallback(
    (doctype) => {
      if (!doctype) {
        latestFieldsDoctypeRef.current = null;
        setFields([]);
        return;
      }
      if (fieldCache.current[doctype]) {
        latestFieldsDoctypeRef.current = doctype;
        setFields(fieldCache.current[doctype]);
        return;
      }
      latestFieldsDoctypeRef.current = doctype;
      setFieldsLoading(true);
      setFields([]);
      getAxisFieldsForDoctype({ axisType, chartType, doctype })
        .then((rows) => {
          if (latestFieldsDoctypeRef.current !== doctype) return;
          fieldCache.current[doctype] = rows;
          setFields(rows);
        })
        .catch(() => {
          if (latestFieldsDoctypeRef.current !== doctype) return;
          setFields([]);
        })
        .finally(() => {
          if (latestFieldsDoctypeRef.current !== doctype) return;
          setFieldsLoading(false);
        });
    },
    [axisType, chartType],
  );

  return { doctypes, doctypesLoading, fields, fieldsLoading, loadFieldsForDoctype };
}

/** Load X- and Y-axis options for a chart type (legacy flat-list approach — kept for AI agent consumers). */
export function useAxisOptions(chartType) {
  const [xOptions, setXOptions] = useState([]);
  const [yOptions, setYOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chartType) return undefined;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getChatbotXAxisOptions({ chartType }).catch(() => []),
      getChatbotYAxisOptions({ chartType }).catch(() => []),
    ]).then(([x, y]) => {
      if (cancelled) return;
      setXOptions(x);
      setYOptions(y);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [chartType]);

  return { xOptions, yOptions, loading };
}

/**
 * Preview hook. Returns a `preview(config)` function that runs the chatbot
 * preview endpoint and returns transformed chart data suitable for
 * DevxAiChartCard. Also exposes `previewing` and `error`.
 */
export function useChartPreview() {
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const previewRequestRef = useRef(0);

  const preview = useCallback(
    async ({
      chartType,
      xOption,
      xTimeBucket = null,
      yOption,
      yAgg,
      groupBy,
      filters,
      title,
      sortBy = null,
      sortDirection = null,
      rowLimit = null,
    }) => {
      const requestId = ++previewRequestRef.current;
      setPreviewing(true);
      setError('');
      try {
        const payload = buildChatbotChartPayload({
          chartType,
          xAxisOption: xOption,
          xTimeBucket,
          yAxisOption: yOption,
          yAggregation: yAgg,
          groupByOption: groupBy,
          filters: filters ?? [],
          sortBy,
          sortDirection,
          rowLimit,
        });
        const apiPayload = {
          ...payload,
          chart_type: resolvePreviewChartType(chartType),
        };
        const response = await previewChatbotChart(apiPayload);
        if (requestId !== previewRequestRef.current) {
          return { data: null, payload: null, stale: true };
        }
        const data = transformChatbotResponseToChartData({
          apiResponse: response,
          title,
          chatbotConfig: payload,
        });
        return { data, payload };
      } catch (error_) {
        if (requestId !== previewRequestRef.current) {
          return { data: null, payload: null, stale: true };
        }
        setError(error_?.message || 'Preview failed');
        return { data: null, payload: null, error: error_ };
      } finally {
        if (requestId === previewRequestRef.current) {
          setPreviewing(false);
        }
      }
    },
    [],
  );

  return { preview, previewing, error };
}
