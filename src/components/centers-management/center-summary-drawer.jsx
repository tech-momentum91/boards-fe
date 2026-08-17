import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { RiFileList3Line } from 'react-icons/ri';
import AICenterModal from '@/components/AI/AICenterModal';
import * as Drawer from '@/components/ui/drawer';
import apiClient from '@/api/axios';
import { showErrorToast } from '@/utils/error-utils';

/**
 * Right-side drawer: AI summary from DeepSeek (records only) + optional raw API JSON.
 */
const CenterSummaryDrawer = ({ open, onOpenChange, centerDocname, centerDisplayName }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    if (!open || !centerDocname) {
      return undefined;
    }

    let cancelled = false;
    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      setAiSummary(null);
      setAiError(null);
      try {
        const response = await apiClient.post('/method/devx.api.core.get_center_summary', {
          doctype: 'Center',
          docname: centerDocname,
        });
        if (!cancelled) {
          setSummaryData(response.data?.message ?? response.data);
        }
      } catch (error) {
        if (!cancelled) {
          const msg =
            error?.response?.data?.message ||
            error?.response?.data?.exception ||
            error?.message ||
            'Failed to load summary';
          setSummaryError(typeof msg === 'string' ? msg : JSON.stringify(msg));
          setSummaryData(null);
          showErrorToast(error, { defaultMessage: 'Failed to load center summary' });
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [open, centerDocname]);

  useEffect(() => {
    if (!open || !centerDocname || summaryLoading || summaryError || summaryData == null) {
      return undefined;
    }

    const records = summaryData.records;
    if (!Array.isArray(records) || records.length === 0) {
      setAiSummary(null);
      setAiError(null);
      setAiLoading(false);
      return undefined;
    }

    let cancelled = false;
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);

    apiClient
      .post('/method/devx_ai.summary.api.summarize_records', {
        records_json: JSON.stringify(records),
      })
      .then((res) => {
        const result = res.data?.message || res.data;
        if (!cancelled) {
          if (result?.success && result.data) {
            setAiSummary(result.data);
          } else {
            throw new Error(result?.error || 'AI summary failed');
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAiError(error?.message || 'AI summary failed');
          showErrorToast(error, { defaultMessage: 'AI summary failed' });
        }
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, centerDocname, summaryLoading, summaryError, summaryData]);

  useEffect(() => {
    if (!open) {
      setSummaryData(null);
      setSummaryError(null);
      setSummaryLoading(false);
      setAiSummary(null);
      setAiError(null);
      setAiLoading(false);
    }
  }, [open]);

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Content className='relative flex h-full max-w-[560px] flex-col overflow-hidden'>
          <Drawer.Header className='sticky top-0 z-10 border-b border-stroke-soft-200 bg-bg-white-0'>
            <div className='flex items-center justify-between gap-4 px-6 py-5 pr-14'>
              <div className='flex min-w-0 flex-1 items-start gap-3'>
                <div className='shrink-0 rounded-full border border-stroke-soft-200 p-2.5'>
                  <RiFileList3Line size={24} className='text-text-main-900' />
                </div>
                <div className='flex min-w-0 flex-col gap-1'>
                  <Drawer.Title className='label-medium text-text-main-900'>
                    Center summary
                  </Drawer.Title>
                  <p className='truncate paragraph-small text-text-sub-500'>
                    {centerDisplayName || centerDocname}
                  </p>
                  <p className='truncate font-mono paragraph-xsmall text-text-sub-500'>
                    Center · {centerDocname}
                  </p>
                </div>
              </div>
              <button className='ai-trigger-btn' onClick={() => setShowAI(true)}>
                <Sparkles size={14} />
                Ask AI
              </button>
            </div>
          </Drawer.Header>

          <Drawer.Body className='flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6 pt-4'>
            {summaryLoading && (
              <p className='paragraph-small text-text-sub-500'>Loading linked records…</p>
            )}
            {summaryError && !summaryLoading && (
              <p className='paragraph-small text-text-error-500'>{summaryError}</p>
            )}
            {!summaryLoading && !summaryError && summaryData !== null && (
              <>
                <section className='flex flex-col gap-2'>
                  <h3 className='label-small text-text-sub-500'>AI overview</h3>
                  {aiLoading && (
                    <p className='paragraph-small text-text-sub-500'>Generating summary…</p>
                  )}
                  {aiError && !aiLoading && (
                    <p className='paragraph-small text-text-error-500'>{aiError}</p>
                  )}
                  {aiSummary && !aiLoading && (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4'>
                      <p className='whitespace-pre-wrap paragraph-small leading-relaxed text-text-main-900'>
                        {aiSummary}
                      </p>
                    </div>
                  )}
                  {!aiLoading &&
                    !aiError &&
                    !aiSummary &&
                    Array.isArray(summaryData.records) &&
                    summaryData.records.length === 0 && (
                      <p className='paragraph-small text-text-sub-500'>
                        No linked records to summarise.
                      </p>
                    )}
                </section>

                <details className='group rounded-xl border border-stroke-soft-200 bg-bg-weak-50'>
                  <summary className='cursor-pointer select-none px-4 py-3 paragraph-small font-medium text-text-main-900'>
                    Raw API response (includes references)
                  </summary>
                  <pre className='max-h-[40vh] overflow-auto whitespace-pre-wrap break-words border-t border-stroke-soft-200 p-4 font-mono text-[11px] leading-relaxed text-text-main-900'>
                    {JSON.stringify(summaryData, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>

      {showAI && (
        <AICenterModal
          centerId={centerDocname}
          centerName={centerDisplayName}
          onClose={() => setShowAI(false)}
        />
      )}
    </>
  );
};

export default CenterSummaryDrawer;
