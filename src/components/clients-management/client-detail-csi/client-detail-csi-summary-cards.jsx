import React from 'react';
import { useSelector } from 'react-redux';
import {
  RiTokenSwapFill,
  RiTimeFill,
  RiCheckboxCircleFill,
  RiArrowDownSLine,
} from 'react-icons/ri';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import { getBadgeClasses } from '@/utils/csi-utils';
import { selectCsiSummary } from '@/redux/clientDetailSlice';

const ClientDetailCsiSummaryCards = () => {
  const csiSummary = useSelector(selectCsiSummary);
  const data = csiSummary?.data ?? {};
  const avgScore = data.avg_csi_score ?? null;
  const pendingCount = data.pending_count ?? 0;
  const completedCount = data.completed_count ?? 0;
  const serviceRatingAverages = (data.breakdown || []).map((item) => ({
    service: item.service,
    average: item.average_rating,
  }));

  const cards = [
    {
      key: 'avgScore',
      value: avgScore === null ? '--' : `${avgScore}/10`,
      label: 'Avg. CSI Score',
      icon: RiTokenSwapFill,
      showLink: true,
      paddingY: 'py-[10px]',
    },
    {
      key: 'pending',
      value: pendingCount,
      label: 'Pending CSI',
      icon: RiTimeFill,
      showLink: false,
      paddingY: 'py-[12px]',
    },
    {
      key: 'completed',
      value: completedCount,
      label: 'Completed CSI',
      icon: RiCheckboxCircleFill,
      showLink: false,
      paddingY: 'py-[12px]',
    },
  ];

  return (
    <div className='flex gap-4 px-6 py-5'>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`flex flex-1 items-center gap-4 rounded-xl bg-bg-weak-100 border border-stroke-soft-200 px-4 ${card.paddingY} shadow-[0px_2px_4px_rgba(27,28,29,0.04)]`}
          >
            <div className='flex flex-col gap-1 flex-1 min-w-0'>
              <p className='text-title-h6 text-text-main-900'>{card.value}</p>
              <div className='flex flex-col gap-0.5'>
                <p className='text-[12px] leading-[16px] font-medium uppercase tracking-[0.48px] opacity-72 text-text-sub-500'>
                  {card.label}
                </p>
                {card.showLink && (
                  <div className='flex items-center gap-1'>
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <LinkButton.Root variant='primary' size='small' underline>
                          See Detailed Breakdown
                          <LinkButton.Icon as={RiArrowDownSLine} className='size-4' />
                        </LinkButton.Root>
                      </Popover.Trigger>
                      <Popover.Content
                        className='p-0'
                        side='bottom'
                        align='start'
                        sideOffset={8}
                        showArrow={false}
                      >
                        <div className='bg-bg-white-0 rounded-2xl shadow-regular-large border border-stroke-soft-200 min-w-[260px] flex flex-col gap-2 p-4'>
                          <p className='text-subheading-2xs text-text-soft-400'>
                            AVG. OVERALL CSI RATINGS
                          </p>
                          <div className='flex flex-col gap-3'>
                            {csiSummary?.isLoading ? (
                              <div className='py-1.5 flex items-center justify-center'>
                                <div className='w-4 h-4 border-2 border-primary-base border-t-transparent rounded-full animate-spin' />
                              </div>
                            ) : csiSummary?.error ? (
                              <div className='py-1.5'>
                                <p className='text-paragraph-sm text-error-base'>
                                  Failed to load breakdown.
                                </p>
                              </div>
                            ) : serviceRatingAverages.length > 0 ? (
                              serviceRatingAverages.map(({ service, average }) => {
                                const rounded = Math.round(average);
                                const badgeClasses = getBadgeClasses(rounded);

                                return (
                                  <div
                                    key={service}
                                    className='flex items-center justify-between gap-3'
                                  >
                                    <span className='text-paragraph-sm text-text-sub-500 truncate'>
                                      {service}
                                    </span>
                                    <span
                                      className={`inline-flex items-center justify-center min-w-6 h-6 rounded-full text-[13px] font-semibold ${badgeClasses}`}
                                    >
                                      {rounded}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className='py-1.5'>
                                <p className='text-paragraph-sm text-text-sub-500'>
                                  No completed CSI ratings available.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popover.Content>
                    </Popover.Root>
                  </div>
                )}
              </div>
            </div>
            <div className='bg-white border border-stroke-soft-200 rounded-full p-2 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] shrink-0'>
              <Icon className='size-6 text-text-soft-400' />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientDetailCsiSummaryCards;
