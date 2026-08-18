import { useMemo, useState } from 'react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { SmilePlus } from 'lucide-react';
import { RiThumbUpFill, RiThumbUpLine } from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const THUMBS_UP_EMOJI = '👍';

function ReactionPicker({ onSelect, disabled = false }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          aria-label='Add reaction'
          className={cn(
            'flex size-7 items-center justify-center rounded-full text-icon-sub-500 transition-colors',
            'hover:bg-bg-weak-100 hover:text-text-main-900',
            open && 'bg-bg-weak-100 text-text-main-900',
            'disabled:pointer-events-none disabled:opacity-40',
          )}
        >
          <SmilePlus size={18} strokeWidth={1.75} />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        side='top'
        showArrow={false}
        className='w-auto overflow-hidden p-0'
      >
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            const emoji = emojiData?.emoji;
            if (!emoji) {
              return;
            }
            onSelect?.(emoji);
            setOpen(false);
          }}
          autoFocusSearch
          searchPlaceHolder='Search...'
          theme={Theme.LIGHT}
          emojiStyle={EmojiStyle.NATIVE}
          previewConfig={{ showPreview: false }}
          height={360}
          width={320}
          lazyLoadEmojis
        />
      </Popover.Content>
    </Popover.Root>
  );
}

function ThumbsUpButton({
  reaction,
  disabled = false,
  readOnly = false,
  isUpdating = false,
  onToggle,
}) {
  const count = Number(reaction?.count) || 0;
  const reacted = Boolean(reaction?.current_user_reacted);
  const names = (reaction?.users || [])
    .map((user) => user.full_name || user.user)
    .filter(Boolean)
    .join(', ');

  const ThumbIcon = reacted ? RiThumbUpFill : RiThumbUpLine;

  const button = (
    <button
      type='button'
      aria-label={count > 0 ? `Thumbs up, ${count}` : 'React with thumbs up'}
      aria-pressed={reacted}
      disabled={disabled || readOnly || isUpdating || !onToggle}
      onClick={() => onToggle?.(THUMBS_UP_EMOJI)}
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1 rounded-full transition-colors',
        count > 0 ? 'min-w-7 border px-2' : 'size-7',
        reacted
          ? 'border-primary-base/30 bg-primary-alpha-10 text-primary-base'
          : 'border-stroke-soft-200 text-icon-sub-500 hover:bg-bg-weak-100 hover:text-text-main-900',
        count > 0 && !reacted && 'bg-bg-weak-50 text-text-sub-500 hover:bg-bg-white-0',
        'disabled:pointer-events-none disabled:opacity-40',
        (disabled || readOnly || !onToggle) && 'cursor-default disabled:opacity-100',
      )}
    >
      <ThumbIcon size={16} />
      {count > 0 ? <span className='text-paragraph-xs font-medium'>{count}</span> : null}
    </button>
  );

  if (!names) {
    return button;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
      <Tooltip.Content side='top' size='xsmall'>
        {names}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export default function CommentReactionsBar({
  reactions = [],
  onToggleReaction,
  disabled = false,
  readOnly = false,
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const { thumbsUpReaction, otherReactions } = useMemo(() => {
    const list = (Array.isArray(reactions) ? reactions : []).filter(
      (reaction) => reaction?.emoji && Number(reaction.count) > 0,
    );

    const thumbsUp = list.find((reaction) => reaction.emoji === THUMBS_UP_EMOJI) ?? null;

    const others = list
      .filter((reaction) => reaction.emoji !== THUMBS_UP_EMOJI)
      .sort((a, b) => String(a.emoji).localeCompare(String(b.emoji)));

    return { thumbsUpReaction: thumbsUp, otherReactions: others };
  }, [reactions]);

  const handleToggle = async (emoji) => {
    if (disabled || readOnly || isUpdating || !onToggleReaction) {
      return;
    }

    setIsUpdating(true);
    try {
      await onToggleReaction(emoji);
    } finally {
      setIsUpdating(false);
    }
  };

  if (readOnly && !thumbsUpReaction && otherReactions.length === 0) {
    return null;
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className='mt-2 flex flex-wrap items-center gap-1.5 border-t border-stroke-soft-200 pt-2'>
        {!readOnly || thumbsUpReaction ? (
          <ThumbsUpButton
            reaction={thumbsUpReaction}
            disabled={disabled}
            readOnly={readOnly}
            isUpdating={isUpdating}
            onToggle={readOnly ? undefined : handleToggle}
          />
        ) : null}

        {otherReactions.map((reaction) => {
          const names = (reaction.users || [])
            .map((user) => user.full_name || user.user)
            .filter(Boolean)
            .join(', ');

          return (
            <Tooltip.Root key={reaction.emoji}>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  disabled={disabled || readOnly || isUpdating || !onToggleReaction}
                  onClick={() => handleToggle(reaction.emoji)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-full border px-2 text-paragraph-xs transition-colors',
                    reaction.current_user_reacted
                      ? 'border-primary-base/30 bg-primary-alpha-10 text-primary-base'
                      : 'border-stroke-soft-200 bg-bg-weak-50 text-text-sub-500 hover:bg-bg-white-0',
                    (disabled || readOnly || !onToggleReaction) && 'cursor-default',
                  )}
                >
                  <span className='text-sm leading-none'>{reaction.emoji}</span>
                  <span className='font-medium'>{reaction.count}</span>
                </button>
              </Tooltip.Trigger>
              {names ? (
                <Tooltip.Content side='top' size='xsmall'>
                  {names}
                </Tooltip.Content>
              ) : null}
            </Tooltip.Root>
          );
        })}

        {!readOnly ? (
          <ReactionPicker
            disabled={disabled || isUpdating}
            onSelect={(emoji) => handleToggle(emoji)}
          />
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}
