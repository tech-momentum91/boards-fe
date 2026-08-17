import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import * as CompactButton from '@/components/ui/compact-button';
import * as Dropdown from '@/components/ui/dropdown';
import DevxAiChartCard from '@/components/devx-ai-chart-card';
import { vizLabel } from '@/components/devx-ai-chart-visualizations';
import logoMark from '@/assets/svgs/Layer.svg';
import { DevxAiChatMarkdown } from '@/components/devx-ai-chat-markdown';
import { DevxAiUpdateConfirmCard } from '@/components/devx-ai-update-confirm-card';
import { postDevxAiChat } from '@/services/devx-ai-chat-service';
import {
  generateChartFromQuery,
  transformChatbotResponseToChartData,
} from '@/services/chatbot-chart-service';
import { selectDevxAiChatOpen, setDevxAiChatOpen } from '@/redux/uiSlice';
import { cn } from '@/utils/cn';
import { normalizeChartPayload } from '@/utils/devx-ai-chart-data';
import { showErrorToast } from '@/utils/error-utils';
import { streamAssistantText } from '@/utils/devx-ai-chat-stream';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiBarChartLine,
  RiCloseFill,
  RiDatabase2Line,
  RiEdit2Line,
  RiErrorWarningLine,
  RiHistoryLine,
  RiLayoutLeftLine,
  RiMicLine,
  RiPieChartLine,
  RiSearchLine,
  RiSendPlaneLine,
} from 'react-icons/ri';

const MODULE_OPTIONS = ['All Modules', 'Dashboard', 'Centers', 'Clients'];

const SUGGESTIONS = [
  {
    id: 'tickets-month',
    label: 'Show me ticket count by month grouped by status',
    Icon: RiBarChartLine,
  },
  { id: 'helpdesk', label: 'I want to see helpdesk performance', Icon: RiPieChartLine },
  { id: 'attention', label: 'Show what needs my attention', Icon: RiSearchLine },
  { id: 'urgent', label: 'Any urgent issues?', Icon: RiErrorWarningLine },
];

function mapChartDataToUserTag(chartData) {
  if (chartData?.default_component) {
    return vizLabel(String(chartData.default_component));
  }
  const t = String(chartData?.chart_type ?? 'bar').toLowerCase();
  if (t === 'bar' || t === 'vertical_bar' || t === 'column') return 'Vertical Bar Chart';
  if (t === 'horizontal_bar' || t === 'horizontal') return 'Horizontal Bar Chart';
  if (t === 'line') return 'Line Chart';
  if (t === 'pie') return 'Pie Chart';
  if (t === 'area') return 'Area Chart';
  return 'Chart';
}

function buildAssistantCopy(result) {
  if (result?.error) return null;
  const text = result?.response ?? result?.agent_message;
  if (typeof text === 'string' && text.trim()) return text.trim();
  const title = result?.chart_data?.title;
  if (title) {
    return `Here is ${title}.`;
  }
  return null;
}

function needsUpdateConfirmation(result) {
  return Boolean(result?.confirmation_required && result?.confirm_token);
}

function isBulkUpdateConfirmation(result) {
  return result?.confirm_payload?.action === 'bulk_update';
}

function buildAssistantTextForResult(result) {
  const needsConfirm = needsUpdateConfirmation(result);
  const base = buildAssistantCopy(result);
  if (!needsConfirm) {
    return base;
  }
  const bulk = isBulkUpdateConfirmation(result);
  const hint = bulk
    ? 'Review the **bulk** change below (row count and filters). Expand **Preview sample** if needed, then confirm to apply to every matching row, or cancel.'
    : 'Review the proposed change below. Click **Confirm update** to save it to the database, or **Cancel** to discard.';
  if (base) {
    return `${base}\n\n${hint}`;
  }
  return hint;
}

function newMessageId(prefix) {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    return `${prefix}-${c.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function InsightSourcesBadge({ insightMeta }) {
  const [open, setOpen] = useState(false);
  if (!insightMeta || !Array.isArray(insightMeta.matched) || insightMeta.matched.length === 0) {
    return null;
  }
  const { matched, center } = insightMeta;
  const totalRows = matched.reduce((sum, e) => sum + (e.row_count ?? 0), 0);
  return (
    <div className='mt-1.5'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex items-center gap-1 rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-2 py-0.5 text-[11px] text-text-soft-400 transition hover:bg-bg-soft-200'
      >
        <RiDatabase2Line className='size-3 shrink-0' aria-hidden />
        {totalRows} data rows analysed
        <RiArrowDownSLine
          className={cn('size-3 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <ul className='mt-1 space-y-0.5 rounded-md border border-stroke-soft-200 bg-bg-weak-50 p-2 text-[11px] text-text-sub-500'>
          {center && (
            <li className='font-medium'>
              Center: <span className='text-text-main-900'>{center}</span>
            </li>
          )}
          {matched.map((e) => (
            <li key={e.id} className='flex items-center justify-between gap-2'>
              <span className='truncate'>{e.name ?? e.id}</span>
              <span className='shrink-0 tabular-nums text-text-soft-400'>
                {e.row_count ?? 0} rows
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * DevX AI assistant panel.
 * Chart requests use the Chatbot pipeline; other queries fall back to the chat/update orchestrator.
 */
const DevxAiChatSidebar = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectDevxAiChatOpen);
  const [message, setMessage] = useState('');
  const [selectedModule, setSelectedModule] = useState(MODULE_OPTIONS[0]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [confirmBusyMessageId, setConfirmBusyMessageId] = useState(null);

  const scrollRef = useRef(null);

  const handleClose = useCallback(() => {
    dispatch(setDevxAiChatOpen(false));
  }, [dispatch]);

  const handleUpdateDecline = useCallback((messageId) => {
    setMessages((prev) =>
      prev.map((x) =>
        x.id === messageId && x.updateConfirmation
          ? { ...x, updateConfirmation: { ...x.updateConfirmation, status: 'declined' } }
          : x,
      ),
    );
  }, []);

  const handleUpdateConfirm = useCallback(
    async (messageId, confirmToken, chatSessionId) => {
      const sid = chatSessionId || sessionId;
      if (!confirmToken || !sid) {
        showErrorToast(new Error('Missing session or token.'), {
          defaultMessage: 'Cannot confirm this update.',
        });
        return;
      }
      setConfirmBusyMessageId(messageId);
      try {
        const res = await postDevxAiChat({ query: '', sessionId: sid, confirmToken });
        if (res.session_id) {
          setSessionId(res.session_id);
        }
        setMessages((prev) =>
          prev.map((x) => {
            if (x.id !== messageId || !x.updateConfirmation) {
              return x;
            }
            if (res.error) {
              let msg = String(res.error);
              const ur = res.update_result;
              if (ur?.bulk && typeof ur.updated === 'number') {
                msg = `${msg} (${ur.updated} succeeded, ${ur.failed ?? 0} failed).`;
              }
              return {
                ...x,
                updateConfirmation: {
                  ...x.updateConfirmation,
                  status: 'error',
                  errorMessage: msg,
                },
              };
            }
            return {
              ...x,
              updateConfirmation: {
                ...x.updateConfirmation,
                status: 'confirmed',
                updateResult: res.update_result ?? null,
              },
            };
          }),
        );
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not apply the update.' });
        setMessages((prev) =>
          prev.map((x) =>
            x.id === messageId && x.updateConfirmation
              ? {
                  ...x,
                  updateConfirmation: {
                    ...x.updateConfirmation,
                    status: 'error',
                    errorMessage: 'Request failed. You can try Confirm again.',
                  },
                }
              : x,
          ),
        );
      } finally {
        setConfirmBusyMessageId(null);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const appendAssistantMessage = useCallback(
    async (result, { chartData = null } = {}) => {
      const assistantId = newMessageId('assistant');
      const responseText = buildAssistantTextForResult(result);
      const updateConfirmation = needsUpdateConfirmation(result)
        ? {
            status: 'pending',
            confirmToken: result.confirm_token,
            payload: result.confirm_payload ?? {},
          }
        : null;

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          createdAt: new Date(),
          responseText: '',
          streamActive: Boolean(responseText),
          chartData,
          insightMeta: result.insight_meta ?? null,
          error: result.error ?? null,
          updateConfirmation,
          chatSessionId: result.session_id ?? sessionId,
        },
      ]);

      if (responseText) {
        await streamAssistantText(responseText, (slice) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, responseText: slice } : m)),
          );
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streamActive: false } : m)),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streamActive: false } : m)),
        );
      }
    },
    [sessionId],
  );

  const handleOrchestratorFallback = useCallback(
    async (text, userId) => {
      const result = await postDevxAiChat({ query: text, sessionId });
      const resolvedSessionId = result.session_id ?? sessionId;
      if (result.session_id) {
        setSessionId(result.session_id);
      }

      const chartData = normalizeChartPayload(result.chart_data);

      if (chartData) {
        const tag = mapChartDataToUserTag(chartData);
        setMessages((prev) => prev.map((m) => (m.id === userId ? { ...m, chartTag: tag } : m)));
      }

      await appendAssistantMessage({ ...result, session_id: resolvedSessionId }, { chartData });
    },
    [appendAssistantMessage, sessionId],
  );

  const sendQuery = useCallback(
    async (rawText) => {
      const text = String(rawText ?? '').trim();
      if (!text || loading) return;

      const userId = newMessageId('user');
      setMessages((prev) => [...prev, { id: userId, role: 'user', text }]);
      setMessage('');
      setLoading(true);

      try {
        // 1) Try the chatbot AI pipeline (chart-focused).
        const exp = await generateChartFromQuery(text);

        if (exp?.status === 'success') {
          const chatbotConfig = exp.chart_spec ?? null;
          const chartData = transformChatbotResponseToChartData({
            apiResponse: exp,
            title: exp.chart_name || exp.metadata?.x_label || 'Chart',
            chatbotConfig,
          });

          if (chartData) {
            const tag = mapChartDataToUserTag(chartData);
            setMessages((prev) => prev.map((m) => (m.id === userId ? { ...m, chartTag: tag } : m)));
          }

          await appendAssistantMessage(
            {
              agent_message: exp.metadata?.interpretation || '',
              error: chartData ? null : 'Chart generation failed.',
            },
            { chartData },
          );
          return;
        }

        // 2) Not a chart request (or chart attempt failed) — fall back to the
        //    conversational chatbot for general Q&A / data updates.
        await handleOrchestratorFallback(text, userId);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'DevX AI could not complete this request.' });
      } finally {
        setLoading(false);
      }
    },
    [appendAssistantMessage, handleOrchestratorFallback, loading],
  );

  const handleSend = useCallback(() => {
    sendQuery(message);
  }, [message, sendQuery]);

  const handleSuggestionClick = useCallback(
    (text) => {
      setMessage(text);
      sendQuery(text);
    },
    [sendQuery],
  );

  const handleComposerKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!isOpen) {
    return null;
  }

  const hasConversation = messages.length > 0;

  return (
    <aside
      className={cn(
        'relative flex h-full min-h-0 w-[440px] shrink-0 flex-col overflow-hidden',
        'rounded-br-[20px] rounded-tr-[20px] border-l border-stroke-soft-200 bg-bg-white-0',
        'shadow-[0_16px_40px_-8px_rgba(88,92,95,0.16)]',
      )}
      aria-label='DevX AI assistant'
    >
      <div className='pointer-events-none absolute inset-0 overflow-hidden' aria-hidden>
        <div className='absolute -left-4 top-[55%] size-[208px] rounded-full bg-purple-200/35 blur-3xl' />
        <div className='absolute left-[85px] top-[30%] size-[242px] rounded-full bg-purple-300/25 blur-3xl' />
        <div className='absolute left-[223px] top-[36%] size-[242px] rounded-full bg-emerald-200/20 blur-3xl' />
        <div className='absolute left-[93px] top-[52%] size-[208px] rounded-full bg-violet-200/30 blur-3xl' />
      </div>

      {/* Header — Figma Group 99 */}
      <header className='relative z-[2] flex h-14 shrink-0 items-center border-b border-stroke-soft-200 bg-bg-white-0 px-4'>
        <div className='flex items-center gap-1.5'>
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='large'
            onClick={handleClose}
            className='rounded-lg'
            aria-label='Collapse DevX AI'
          >
            <CompactButton.Icon as={RiLayoutLeftLine} />
          </CompactButton.Root>
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='large'
            className='rounded-lg'
            aria-label='Chat history'
          >
            <CompactButton.Icon as={RiHistoryLine} />
          </CompactButton.Root>
        </div>

        <div className='pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1'>
          <img src={logoMark} alt='' className='h-[14px] w-auto' />
          <span
            className={cn(
              'bg-[linear-gradient(118.98deg,#313339_50.7%,#b69bf2_83.48%)] bg-clip-text',
              'text-[19.2px] font-bold leading-6 text-transparent',
            )}
          >
            DevX AI
          </span>
        </div>

        <div className='ml-auto'>
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='large'
            onClick={handleClose}
            className='rounded-lg'
            aria-label='Close DevX AI'
          >
            <CompactButton.Icon as={RiCloseFill} />
          </CompactButton.Root>
        </div>
      </header>

      <div
        ref={scrollRef}
        className='relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 pt-4'
      >
        {hasConversation ? (
          <div className='flex flex-col gap-6 pb-4'>
            {messages.map((m) => {
              if (m.role === 'user') {
                return (
                  <div key={m.id} className='flex w-full flex-col items-end gap-2'>
                    <div className='w-full max-w-[372px] rounded-xl rounded-br-xl rounded-tl-xl bg-[#f3f5f7] p-4'>
                      {m.chartTag ? (
                        <div className='mb-2 inline-flex items-center gap-1 rounded-md border border-[#cac2ff] bg-[#eeebff] py-0.5 pl-0.5 pr-2'>
                          <span className='flex size-5 items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
                            <RiBarChartLine className='size-3.5 text-text-sub-600' />
                          </span>
                          <span className='text-[14px] font-medium leading-5 tracking-[-0.084px] text-[#5a36bf]'>
                            {m.chartTag}
                          </span>
                        </div>
                      ) : null}
                      <p className='paragraph-small text-text-main-900'>{m.text}</p>
                    </div>
                  </div>
                );
              }

              const timeLabel =
                m.createdAt instanceof Date ? format(m.createdAt, 'do MMM yyyy, h:mm a') : '';

              return (
                <div key={m.id} className='flex w-full flex-col gap-3'>
                  <div className='flex items-start gap-3'>
                    <div
                      className={cn(
                        'relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full',
                        'bg-gradient-to-b from-[#9333ea] to-[#4f46e5] p-1',
                      )}
                    >
                      <img src={logoMark} alt='' className='relative z-[1] h-2.5 w-auto' />
                    </div>
                    <p className='pt-0.5 text-[12px] font-medium leading-4 text-text-soft-400'>
                      {timeLabel}
                    </p>
                  </div>

                  {m.chartData ? (
                    <DevxAiChartCard chartData={m.chartData} className='self-start' />
                  ) : null}

                  {m.error ? (
                    <p className='paragraph-small text-error-base'>{String(m.error)}</p>
                  ) : null}

                  {m.responseText?.trim() || m.streamActive ? (
                    <div
                      className={cn(
                        'max-w-[392px] rounded-2xl border border-stroke-soft-200 bg-gradient-to-br from-bg-white-0 to-[#f8f7fc]/90 p-4 shadow-[0_1px_3px_rgba(88,92,95,0.06)]',
                        m.streamActive && 'ring-1 ring-purple-500/20',
                      )}
                    >
                      {m.responseText?.trim() ? (
                        <DevxAiChatMarkdown markdown={m.responseText} />
                      ) : null}
                      {m.streamActive ? (
                        <div className='mt-2 flex items-center gap-2 text-[11px] font-medium tracking-tight text-text-soft-400'>
                          <span className='inline-flex items-center gap-0.5' aria-hidden>
                            <span className='size-1.5 animate-pulse rounded-full bg-purple-500' />
                            <span className='size-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:150ms]' />
                            <span className='size-1.5 animate-pulse rounded-full bg-purple-300 [animation-delay:300ms]' />
                          </span>
                          Generating…
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {m.insightMeta ? <InsightSourcesBadge insightMeta={m.insightMeta} /> : null}

                  {m.updateConfirmation ? (
                    <DevxAiUpdateConfirmCard
                      payload={m.updateConfirmation.payload}
                      status={m.updateConfirmation.status}
                      busy={confirmBusyMessageId === m.id}
                      updateResult={m.updateConfirmation.updateResult}
                      errorMessage={m.updateConfirmation.errorMessage}
                      onConfirm={() =>
                        handleUpdateConfirm(
                          m.id,
                          m.updateConfirmation.confirmToken,
                          m.chatSessionId,
                        )
                      }
                      onDecline={() => handleUpdateDecline(m.id)}
                    />
                  ) : null}
                </div>
              );
            })}
            {loading ? (
              <div className='paragraph-small flex items-center gap-2 text-text-sub-500'>
                <span className='inline-block size-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                Thinking…
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className='flex flex-col items-center gap-4 pb-6 text-center'>
              <div className='flex items-center gap-1.5'>
                <img src={logoMark} alt='' className='h-6 w-auto shrink-0' />
                <span
                  className={cn(
                    'bg-[linear-gradient(119.78deg,#313339_50.7%,#b69bf2_83.48%)] bg-clip-text',
                    'text-[32px] font-bold leading-10 text-transparent',
                  )}
                >
                  DevX AI
                </span>
              </div>
              <p className='label-large max-w-[392px] text-text-sub-500'>Where should we start?</p>
            </div>
            <div className='mx-auto flex w-full max-w-[392px] flex-col gap-1.5'>
              {SUGGESTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type='button'
                  onClick={() => handleSuggestionClick(label)}
                  disabled={loading}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl border border-[rgba(226,228,233,0.6)]',
                    'bg-bg-white-0 py-1 pl-1 pr-2 shadow-[0_1px_2px_0_rgba(228,229,231,0.24)]',
                    'transition duration-200 ease-out hover:bg-bg-weak-50',
                    loading && 'pointer-events-none opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex shrink-0 items-center rounded-lg bg-gradient-to-b from-[#f7eefe] to-[#ebeafe] p-1',
                    )}
                  >
                    <Icon className='size-5 text-text-sub-600' aria-hidden />
                  </span>
                  <span className='label-small min-w-0 flex-1 text-left text-text-main-900'>
                    {label}
                  </span>
                  <RiArrowRightUpLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className='relative z-[2] shrink-0 px-6 pb-6 pt-2'>
        <div
          className='pointer-events-none absolute inset-x-0 bottom-24 top-0 bg-gradient-to-t from-bg-white-0 via-transparent to-transparent'
          aria-hidden
        />
        <div className='relative overflow-hidden rounded-2xl border-2 border-purple-600 bg-bg-white-0 p-4 shadow-regular-md'>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder='Tell AI what do next....'
            rows={3}
            disabled={loading}
            className={cn(
              'paragraph-small mb-4 min-h-[60px] w-full resize-none bg-transparent',
              'text-text-main-900 placeholder:text-text-soft-400',
              'outline-none focus:outline-none',
              loading && 'cursor-not-allowed opacity-60',
            )}
          />
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-1.5'>
              <CompactButton.Root
                type='button'
                variant='stroke'
                size='large'
                className='rounded-lg'
                aria-label='Edit message'
                disabled={loading}
              >
                <CompactButton.Icon as={RiEdit2Line} />
              </CompactButton.Root>
              <CompactButton.Root
                type='button'
                variant='stroke'
                size='large'
                className='rounded-lg'
                aria-label='Add attachment'
                disabled={loading}
              >
                <CompactButton.Icon as={RiAddLine} />
              </CompactButton.Root>
              <CompactButton.Root
                type='button'
                variant='stroke'
                size='large'
                className='rounded-lg'
                aria-label='Voice input'
                disabled={loading}
              >
                <CompactButton.Icon as={RiMicLine} />
              </CompactButton.Root>
            </div>
            <div className='flex items-center gap-2'>
              <Dropdown.Root>
                <Dropdown.Trigger asChild>
                  <button
                    type='button'
                    disabled={loading}
                    className={cn(
                      'label-small flex items-center gap-1 rounded-lg py-1 pl-2 pr-1',
                      'text-text-main-900 outline-none transition hover:bg-bg-weak-50',
                      'focus-visible:ring-2 focus-visible:ring-primary-base/30',
                      loading && 'pointer-events-none opacity-60',
                    )}
                  >
                    <span className='whitespace-nowrap'>{selectedModule}</span>
                    <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-600' />
                  </button>
                </Dropdown.Trigger>
                <Dropdown.Content align='end' className='min-w-[200px]'>
                  {MODULE_OPTIONS.map((option) => (
                    <Dropdown.Item
                      key={option}
                      onClick={() => {
                        setSelectedModule(option);
                      }}
                    >
                      {option}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Content>
              </Dropdown.Root>
              <button
                type='button'
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg',
                  'bg-bg-weak-100 text-text-sub-600 transition hover:bg-bg-weak-50',
                  'disabled:pointer-events-none disabled:opacity-40',
                )}
                aria-label='Send message'
              >
                <RiSendPlaneLine className='size-5' />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DevxAiChatSidebar;
