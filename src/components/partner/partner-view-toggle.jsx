import React from 'react';
import { RiFileList2Line, RiLayoutGridLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';

const VIEW_LIST = 'list';
const VIEW_CARD = 'card';

const PartnerViewToggle = ({ view, onViewChange, className }) => {
  const isList = view === VIEW_LIST;
  const isCard = view === VIEW_CARD;

  return (
    <div
      className={
        className
          ? `flex items-center rounded-lg border border-stroke-soft-200 overflow-hidden ${className}`
          : 'flex items-center rounded-lg border border-stroke-soft-200 overflow-hidden'
      }
    >
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            className={`flex h-8 w-9 items-center justify-center transition-colors ${
              isList
                ? 'bg-primary-base text-white'
                : 'bg-white text-text-sub-600 hover:bg-bg-weak-50'
            }`}
            onClick={() => onViewChange?.(VIEW_LIST)}
            aria-label='List view'
            aria-pressed={isList}
          >
            <RiFileList2Line size={20} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>List view</p>
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            className={`flex h-8 w-9 items-center justify-center border-l border-stroke-soft-200 transition-colors ${
              isCard
                ? 'bg-primary-base text-white'
                : 'bg-white text-text-sub-600 hover:bg-bg-weak-50'
            }`}
            onClick={() => onViewChange?.(VIEW_CARD)}
            aria-label='Card view'
            aria-pressed={isCard}
          >
            <RiLayoutGridLine size={20} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Card view</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
};

PartnerViewToggle.displayName = 'PartnerViewToggle';

export default PartnerViewToggle;
export { VIEW_LIST, VIEW_CARD };
