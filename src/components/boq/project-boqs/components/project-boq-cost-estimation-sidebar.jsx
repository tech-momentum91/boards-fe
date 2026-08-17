import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { RiArrowRightSLine, RiSparkling2Fill } from 'react-icons/ri';

import { formatProjectBoqOverviewRupee } from '@/components/boq/project-boqs/components/project-boq-overview-utils';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { setDevxAiChatOpen } from '@/redux/uiSlice';
import { cn } from '@/utils/cn';

const parseNumericInput = (value) => {
  const numeric = Number.parseFloat(
    String(value ?? '')
      .replaceAll(',', '')
      .trim(),
  );
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatEditableNumber = (value, { decimals = 0 } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(numeric);
};

const toDraftValue = (value, { decimals = 0 } = {}) => {
  if (value == null || value === '') return '';
  return formatEditableNumber(value, { decimals });
};

const SidebarField = memo(({ label, value, onChange, suffix, inputMode = 'decimal' }) => (
  <div className='relative flex w-full flex-col gap-1'>
    <Label.Root className='font-medium tracking-[-0.084px]'>{label}</Label.Root>
    <Input.Root size='xsmall' className='w-full shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
      <Input.Wrapper className='bg-[rgba(246,248,250,0.6)]'>
        <Input.Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode={inputMode}
          autoComplete='off'
          aria-label={label}
          className='text-paragraph-sm tracking-[-0.084px] text-text-main-900'
        />
        {suffix ? (
          <Input.Affix className='text-[12px] font-medium uppercase tracking-[0.48px]'>
            {suffix}
          </Input.Affix>
        ) : null}
      </Input.Wrapper>
    </Input.Root>
  </div>
));

SidebarField.displayName = 'SidebarField';

const buildDraftState = ({
  costMarginTarget,
  revenueMargin,
  projectTotalCost,
  projectCostPerSqft,
  differenceCost,
}) => ({
  costMargin: toDraftValue(costMarginTarget, { decimals: 0 }),
  revenueMargin: toDraftValue(revenueMargin, { decimals: 2 }),
  projectTotalCost: toDraftValue(projectTotalCost, { decimals: 0 }),
  projectCostPerSqft: toDraftValue(projectCostPerSqft, { decimals: 0 }),
  differenceCost: parseNumericInput(differenceCost),
});

const ProjectBoqCostEstimationSidebar = memo(
  ({
    costMarginTarget = 30,
    revenueMargin = 0,
    projectTotalCost = 0,
    projectCostPerSqft = 0,
    differenceCost = 0,
    totalSqft = 0,
    className,
    onValuesChange,
  }) => {
    const dispatch = useDispatch();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [draft, setDraft] = useState(() =>
      buildDraftState({
        costMarginTarget,
        revenueMargin,
        projectTotalCost,
        projectCostPerSqft,
        differenceCost,
      }),
    );

    useEffect(() => {
      setDraft(
        buildDraftState({
          costMarginTarget,
          revenueMargin,
          projectTotalCost,
          projectCostPerSqft,
          differenceCost,
        }),
      );
    }, [costMarginTarget, differenceCost, projectCostPerSqft, projectTotalCost, revenueMargin]);

    const emitValues = useCallback(
      (nextDraft) => {
        onValuesChange?.({
          costMarginTarget: parseNumericInput(nextDraft.costMargin),
          revenueMargin: parseNumericInput(nextDraft.revenueMargin),
          projectTotalCost: parseNumericInput(nextDraft.projectTotalCost),
          projectCostPerSqft: parseNumericInput(nextDraft.projectCostPerSqft),
          differenceCost: nextDraft.differenceCost,
        });
      },
      [onValuesChange],
    );

    const updateDraft = useCallback(
      (patch) => {
        setDraft((previous) => {
          const next = { ...previous, ...patch };
          emitValues(next);
          return next;
        });
      },
      [emitValues],
    );

    const handleProjectTotalCostChange = useCallback(
      (rawValue) => {
        const projectTotal = parseNumericInput(rawValue);
        const revenueMarginValue = parseNumericInput(draft.revenueMargin);
        const sqft = parseNumericInput(totalSqft);
        const nextPatch = {
          projectTotalCost: rawValue,
          differenceCost: (projectTotal * revenueMarginValue) / 100,
        };

        if (sqft > 0) {
          nextPatch.projectCostPerSqft = formatEditableNumber(projectTotal / sqft, { decimals: 0 });
        }

        updateDraft(nextPatch);
      },
      [draft.revenueMargin, totalSqft, updateDraft],
    );

    const handleProjectCostPerSqftChange = useCallback(
      (rawValue) => {
        const perSqft = parseNumericInput(rawValue);
        const sqft = parseNumericInput(totalSqft);
        const nextPatch = { projectCostPerSqft: rawValue };

        if (sqft > 0) {
          const projectTotal = perSqft * sqft;
          const revenueMarginValue = parseNumericInput(draft.revenueMargin);
          nextPatch.projectTotalCost = formatEditableNumber(projectTotal, { decimals: 0 });
          nextPatch.differenceCost = (projectTotal * revenueMarginValue) / 100;
        }

        updateDraft(nextPatch);
      },
      [draft.revenueMargin, totalSqft, updateDraft],
    );

    const handleRevenueMarginChange = useCallback(
      (rawValue) => {
        const revenueMarginValue = parseNumericInput(rawValue);
        const projectTotal = parseNumericInput(draft.projectTotalCost);
        updateDraft({
          revenueMargin: rawValue,
          differenceCost: (projectTotal * revenueMarginValue) / 100,
        });
      },
      [draft.projectTotalCost, updateDraft],
    );

    const formattedDifferenceCost = useMemo(
      () => formatProjectBoqOverviewRupee(draft.differenceCost),
      [draft.differenceCost],
    );

    if (isCollapsed) {
      return (
        <aside
          className={cn(
            'relative w-10 shrink-0 border-l border-t border-stroke-soft-200 bg-bg-weak-100',
            className,
          )}
        >
          <div className='absolute top-[9px] left-1/2 flex -translate-x-1/2 items-center justify-center'>
            <CompactButton.Root
              variant='stroke'
              size='medium'
              onClick={() => setIsCollapsed(false)}
              aria-label='Expand cost estimation panel'
            >
              <CompactButton.Icon as={RiArrowRightSLine} className='rotate-180' />
            </CompactButton.Root>
          </div>

          <div className='absolute top-[37px] left-1/2 flex h-[141px] w-5 -translate-x-1/2 items-center justify-center'>
            <div className='-rotate-90'>
              <span className='whitespace-nowrap text-[14px] font-medium uppercase tracking-[0.84px] text-text-soft-400'>
                Cost Estimation
              </span>
            </div>
          </div>
        </aside>
      );
    }

    return (
      <aside
        className={cn(
          'flex w-[312px] shrink-0 flex-col border-l border-t border-stroke-soft-200 bg-bg-weak-100',
          className,
        )}
      >
        <div className='flex items-center gap-2.5 px-5 pt-5'>
          <CompactButton.Root
            variant='stroke'
            size='medium'
            onClick={() => setIsCollapsed(true)}
            aria-label='Collapse cost estimation panel'
          >
            <CompactButton.Icon as={RiArrowRightSLine} />
          </CompactButton.Root>
          <span className='text-[14px] font-medium uppercase tracking-[0.84px] text-text-soft-400'>
            Cost Estimation
          </span>
        </div>

        <div className='flex flex-1 flex-col px-5 pt-4 pb-5'>
          <div className='w-full overflow-hidden rounded-[12px] border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
            <div className='flex flex-col gap-3 p-3'>
              <SidebarField
                label='Cost Margin'
                value={draft.costMargin}
                onChange={(value) => updateDraft({ costMargin: value })}
                suffix='%'
              />
              <SidebarField
                label='Revenue Margin'
                value={draft.revenueMargin}
                onChange={handleRevenueMarginChange}
                suffix='%'
              />
              <SidebarField
                label='Project Total Cost'
                value={draft.projectTotalCost}
                onChange={handleProjectTotalCostChange}
                suffix='₹'
              />
              <SidebarField
                label='Project Cost/Sq.ft'
                value={draft.projectCostPerSqft}
                onChange={handleProjectCostPerSqftChange}
                suffix='₹'
              />
            </div>

            <div className='flex h-[41px] items-center justify-between border-t border-stroke-soft-200 bg-[#fafafa] px-3'>
              <span className='text-[12px] font-medium leading-[18px] text-[#475467]'>
                Difference Cost
              </span>
              <span className='text-[14px] font-semibold leading-5 text-[#475467]'>
                {formattedDifferenceCost}
              </span>
            </div>
          </div>

          <button
            type='button'
            className='mt-4 flex w-full items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition-colors hover:bg-bg-weak-50'
            onClick={() => dispatch(setDevxAiChatOpen(true))}
          >
            <RiSparkling2Fill className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            <span className='px-1 text-[14px] font-medium tracking-[-0.084px] text-text-sub-500'>
              Ask AI to Update BOQ
            </span>
          </button>
        </div>
      </aside>
    );
  },
);

ProjectBoqCostEstimationSidebar.displayName = 'ProjectBoqCostEstimationSidebar';

export default ProjectBoqCostEstimationSidebar;
