import React, { useCallback, useState } from 'react';
import { RiArrowRightSLine, RiCloseLine, RiSendPlane2Line, RiSparklingLine } from 'react-icons/ri';

import { chatEditProposal } from '@/api/crmProposals';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';

const QUICK_PROMPTS = ['Make it more professional', 'Make it more persuasive', 'Make it concise'];

const ProposalBuilderAiPanel = ({
  onClose,
  className,
  clientData,
  templateContent,
  enabledPageKeys,
  onApplyUpdates,
  readOnly,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (text) => {
      const message = (text || input).trim();
      if (!message || loading || readOnly) return;

      setInput('');
      setMessages((prev) => [...prev, { role: 'user', text: message }]);
      setLoading(true);

      try {
        const result = await chatEditProposal({
          message,
          client_data: clientData,
          current_contents: templateContent,
          enabled_slide_ids: enabledPageKeys,
        });

        const reply = result?.reply || 'Done.';
        setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);

        const updates = result?.proposed_updates;
        if (updates && typeof updates === 'object' && Object.keys(updates).length > 0) {
          onApplyUpdates?.(updates);
        }
      } catch (error) {
        showErrorToast(error?.message || 'AI request failed');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Something went wrong. Try again.' },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, readOnly, clientData, templateContent, enabledPageKeys, onApplyUpdates],
  );

  return (
    <aside
      className={cn(
        'flex w-[400px] shrink-0 flex-col border-l border-stroke-soft-200 bg-bg-white-0',
        className,
      )}
    >
      <div className='flex items-center justify-between border-b border-stroke-soft-200 px-4 py-3'>
        <div className='flex items-center gap-2'>
          <span className='flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-feature-base to-purple-500'>
            <RiSparklingLine className='size-4 text-static-white' aria-hidden />
          </span>
          <span className='text-label-md font-semibold text-feature-base'>DevX AI</span>
        </div>
        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xsmall'
          onClick={onClose}
          aria-label='Close AI panel'
        >
          <Button.Icon as={RiCloseLine} />
        </Button.Root>
      </div>

      <div className='flex flex-1 flex-col gap-4 overflow-y-auto p-4'>
        {messages.length === 0 ? (
          <>
            <p className='text-paragraph-medium text-text-main-900'>Where should we start?</p>
            <ul className='flex flex-col gap-2'>
              {QUICK_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type='button'
                    disabled={readOnly || loading}
                    onClick={() => sendMessage(prompt)}
                    className='flex w-full items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-left text-label-sm text-text-main-900 shadow-regular-x-small transition-colors hover:bg-bg-weak-50 disabled:opacity-50'
                  >
                    <span className='inline-flex items-center gap-2'>
                      <RiSparklingLine className='size-4 text-feature-base' aria-hidden />
                      {prompt}
                    </span>
                    <RiArrowRightSLine className='size-4 text-icon-sub-500' aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className='flex flex-col gap-3'>
            {messages.map((msg, index) => (
              <li
                key={`${msg.role}-${index}`}
                className={cn(
                  'rounded-lg px-3 py-2 text-paragraph-small',
                  msg.role === 'user'
                    ? 'ml-6 bg-primary-lighter text-text-main-900'
                    : 'mr-6 bg-bg-weak-50 text-text-sub-600',
                )}
              >
                {msg.text}
              </li>
            ))}
            {loading ? (
              <li className='mr-6 rounded-lg bg-bg-weak-50 px-3 py-2 text-paragraph-small text-text-soft-400'>
                Thinking…
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className='border-t border-stroke-soft-200 p-4'>
        <form
          className='rounded-xl border border-transparent bg-bg-white-0 p-3 shadow-regular-x-small [background:linear-gradient(white,white)_padding-box,linear-gradient(135deg,#cac2ff,#f0abfc,#7dd3fc)_border-box]'
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <textarea
            className='min-h-[72px] w-full resize-none border-0 bg-transparent text-paragraph-small text-text-main-900 outline-none placeholder:text-text-soft-400'
            placeholder={readOnly ? 'Read-only mode' : 'Describe changes to your proposal…'}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={readOnly || loading}
            aria-label='AI message'
          />
          <div className='mt-2 flex items-center justify-end gap-2'>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='xsmall'
              disabled={readOnly || loading || !input.trim()}
              aria-label='Send'
            >
              <Button.Icon as={RiSendPlane2Line} />
            </Button.Root>
          </div>
        </form>
      </div>
    </aside>
  );
};

export default ProposalBuilderAiPanel;
