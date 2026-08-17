import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, ArrowUp, Search } from 'lucide-react';
import { PROMPTS_BY_TAB } from './aiPromptMaps';

/**
 * AIChatBar — chat history + input for the AI Intelligence Workspace.
 *
 * @param {string} centerName
 * @param {string} activeTab — AILeftPanel key for suggested prompts
 * @param {Array} messages — { role, content, timestamp }
 * @param {boolean} isLoading
 * @param {Function} onSend(text)
 * @param {Function} onClear
 * @param {string} timeRange — unused visually; parent passes scope to API
 */
const AIChatBar = ({
  centerName,
  activeTab = 'overview',
  messages = [],
  isLoading = false,
  onSend,
  onClear,
}) => {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef(null);
  const suggested = PROMPTS_BY_TAB[activeTab] || PROMPTS_BY_TAB.overview;
  const emptyChips = suggested.slice(0, 4);

  const showHistory = messages.length > 0 || isLoading;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = (text) => {
    const raw = typeof text === 'string' ? text : inputValue;
    const trimmed = raw.trim();
    if (!trimmed || isLoading) return;
    onSend?.(trimmed);
    if (typeof text !== 'string') setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSendDisabled = isLoading || !inputValue.trim();

  const renderAssistantBody = (content) => {
    if (content && typeof content === 'object' && content.relevant === false) {
      const prompts = Array.isArray(content.suggested_prompts) ? content.suggested_prompts : [];
      return (
        <div className='ai-chat-no-result-card'>
          <Search size={18} className='ai-chat-no-result-icon' aria-hidden />
          <p className='ai-chat-no-result-title'>No relevant data found</p>
          <p className='ai-chat-no-result-text'>
            {content.message ||
              'Try asking about this center’s spaces, billing, tickets, clients, or sales data.'}
          </p>
          {prompts.length > 0 && (
            <div className='ai-chat-no-result-chips'>
              {prompts.slice(0, 3).map((p) => (
                <button
                  key={p}
                  type='button'
                  className='ai-chat-suggest-chip'
                  onClick={() => onSend?.(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (content && typeof content === 'object' && content.relevant === true) {
      const refs = content.data_referenced;
      const sources = Array.isArray(refs) && refs.length > 0 ? refs.join(', ') : null;
      return (
        <>
          <p className='ai-chat-answer-text'>{content.answer}</p>
          {sources && <p className='ai-chat-sources'>Sources: {sources}</p>}
        </>
      );
    }

    const fallback = typeof content === 'string' ? content : JSON.stringify(content ?? '');
    return <p className='ai-chat-answer-text'>{fallback}</p>;
  };

  return (
    <div className='ai-chat-panel-root'>
      {showHistory && (
        <div className='ai-chat-history-wrap'>
          <div className='ai-chat-history-toolbar'>
            <span className='ai-chat-history-label'>Chat</span>
            <button type='button' className='ai-chat-clear-link' onClick={() => onClear?.()}>
              Clear chat
            </button>
          </div>
          <div className='ai-chat-history-scroll' ref={scrollRef}>
            {messages.map((m, i) => {
              const key = `${m.role}-${m.timestamp ?? i}`;
              if (m.role === 'user') {
                return (
                  <div key={key} className='ai-chat-msg ai-chat-msg-user'>
                    <div className='ai-chat-bubble-user'>{m.content}</div>
                  </div>
                );
              }
              return (
                <div key={key} className='ai-chat-msg ai-chat-msg-assistant'>
                  <div className='ai-chat-bubble-assistant'>{renderAssistantBody(m.content)}</div>
                </div>
              );
            })}
            {isLoading && (
              <div className='ai-chat-msg ai-chat-msg-assistant'>
                <div className='ai-chat-typing' aria-label='Assistant is typing'>
                  <span className='ai-chat-dot' />
                  <span className='ai-chat-dot' />
                  <span className='ai-chat-dot' />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className='ai-chat-composer'>
        <div className='ai-chat-bar'>
          <MessageCircle size={18} className='ai-chat-icon' />
          <input
            type='text'
            className='ai-chat-input'
            placeholder={`Ask anything about ${centerName || 'this center'}…`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            type='button'
            className={`ai-send-btn${isSendDisabled ? ' disabled' : ''}`}
            onClick={() => handleSend()}
            disabled={isSendDisabled}
            aria-label='Send message'
          >
            <ArrowUp size={16} />
          </button>
        </div>
        {!showHistory && (
          <div className='ai-chat-inline-chips'>
            {emptyChips.map((p) => (
              <button
                key={p}
                type='button'
                className='ai-chat-suggest-chip ai-chat-suggest-chip--inline'
                onClick={() => onSend?.(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatBar;
