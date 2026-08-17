import React from 'react';
import { RiArrowRightSLine, RiFileSearchLine, RiRouteLine, RiSearchLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import * as Badge from '@/components/ui/badge';

const GlobalSearchResultsList = ({
  results,
  isLoading,
  canSearch,
  query,
  onSelectResult,
  selectedIndex = -1,
  onSelectIndex,
  grouped = true,
  className,
}) => {
  if (isLoading) {
    return <div className='px-3 py-2 text-paragraph-sm text-text-sub-600'>Searching...</div>;
  }

  if (!canSearch) {
    return null;
  }

  if (results.length === 0) {
    return (
      <div className='px-3 py-4 text-center text-paragraph-sm text-text-sub-600'>
        No results found for &quot;{query}&quot;
      </div>
    );
  }

  const groupedResults = grouped
    ? Object.entries(
        results.reduce((accumulator, result) => {
          const key = result.moduleLabel || result.doctype || 'Results';
          accumulator[key] = accumulator[key] || [];
          accumulator[key].push(result);
          return accumulator;
        }, {}),
      )
    : [['Results', results]];

  let runningIndex = -1;

  return (
    <div className={cn('max-h-[460px] overflow-auto pb-3', className)}>
      {groupedResults.map(([sectionTitle, sectionResults]) => (
        <div key={sectionTitle} className='border-b border-stroke-soft-200 last:border-b-0'>
          {grouped && (
            <div className='px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-soft-400'>
              {sectionTitle}
            </div>
          )}
          {sectionResults.map((result) => {
            runningIndex += 1;
            const index = runningIndex;
            const moduleLabel = result.moduleLabel || result.doctype || '';
            const title = String(result.title || '').trim();
            const subtitle = String(result.subtitle || '').trim();
            const isQuickAccess = result.resultType === 'quick-access';
            const normalizedTitle = title.toLowerCase();
            const normalizedModule = moduleLabel.toLowerCase();
            const normalizedSubtitle = subtitle.toLowerCase();
            const shouldShowModuleLine = !grouped && normalizedModule !== normalizedTitle;
            const shouldShowSubtitle =
              subtitle.length > 0 &&
              normalizedSubtitle !== normalizedTitle &&
              normalizedSubtitle !== normalizedModule;

            return (
              <button
                key={result.id}
                type='button'
                className={cn(
                  'w-full px-4 py-2 text-left transition-colors hover:bg-bg-weak-50',
                  selectedIndex === index && 'bg-bg-weak-50',
                )}
                onMouseEnter={() => onSelectIndex?.(index)}
                onClick={() => onSelectResult(result)}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex min-w-0 items-start gap-2.5'>
                    <div className='mt-0.5 shrink-0 text-text-soft-400'>
                      {isQuickAccess ? <RiRouteLine /> : <RiSearchLine />}
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <div className='truncate text-label-sm text-text-strong-950'>
                          {title || moduleLabel}
                        </div>
                        {isQuickAccess ? (
                          <Badge.Root
                            variant='light'
                            size='small'
                            color='green'
                            className='shrink-0'
                          >
                            Route
                          </Badge.Root>
                        ) : null}
                      </div>
                      {shouldShowModuleLine ? (
                        <div className='truncate text-paragraph-xs text-text-sub-600'>
                          {moduleLabel}
                        </div>
                      ) : null}
                      {shouldShowSubtitle ? (
                        <div className='mt-0.5 line-clamp-1 text-paragraph-xs text-text-soft-400'>
                          {subtitle}
                        </div>
                      ) : null}
                      {result.route ? null : (
                        <div className='mt-0.5 text-paragraph-xs text-warning-base'>
                          Route not available for this doctype yet
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='shrink-0 pt-0.5 text-text-soft-400 self-center'>
                    {result.route ? (
                      <RiArrowRightSLine size={16} />
                    ) : (
                      <RiFileSearchLine size={14} />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default GlobalSearchResultsList;
