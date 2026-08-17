import React from 'react';
import { RiAddLine, RiArrowUpDownLine, RiDeleteBin6Line } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

let milestoneCounter = 0;

export const createPaymentMilestone = (overrides = {}) => {
  milestoneCounter += 1;
  return {
    id: `milestone-${Date.now()}-${milestoneCounter}`,
    name: '',
    percentage: '0',
    remarks: '',
    ...overrides,
  };
};

/** Sum of milestone percentages (NaN / empty → 0). */
export function getMilestonePercentageTotal(milestones) {
  return (milestones ?? []).reduce((sum, milestone) => {
    const value = Number.parseFloat(milestone?.percentage);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/** ERPNext Payment Terms Template requires portions to total exactly 100%. */
export function doMilestonesTotalHundred(milestones) {
  return Math.round(getMilestonePercentageTotal(milestones) * 100) / 100 === 100;
}

function MilestoneColumnHeader({ label, sortable = false }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='whitespace-nowrap text-label-sm text-text-soft-400'>{label}</span>
      {sortable ? <RiArrowUpDownLine className='size-5 text-text-soft-400' /> : null}
    </div>
  );
}

function MilestoneNameCell({ milestone, variant, onUpdate }) {
  if (variant === 'listing' && milestone.name) {
    return <span className='text-label-sm text-text-strong-950'>{milestone.name}</span>;
  }

  return (
    <Input.Root size='xsmall' className='max-w-[210px]'>
      <Input.Wrapper>
        <Input.Input
          value={milestone.name ?? ''}
          placeholder='Enter name'
          onChange={(event) => onUpdate('name', event.target.value)}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

function MilestonePercentageCell({ milestone, onUpdate }) {
  return (
    <Input.Root size='xsmall' className='max-w-[210px]'>
      <Input.Wrapper>
        <Input.Input
          value={milestone.percentage ?? ''}
          placeholder='0'
          inputMode='decimal'
          onChange={(event) => onUpdate('percentage', event.target.value)}
        />
        <Input.InlineAffix className='text-subheading-2xs uppercase text-text-soft-400'>
          %
        </Input.InlineAffix>
      </Input.Wrapper>
    </Input.Root>
  );
}

function MilestoneRemarksCell({ milestone, variant, onUpdate }) {
  return (
    <Input.Root size='xsmall' variant={variant === 'listing' ? 'borderless' : 'default'}>
      <Input.Wrapper>
        <Input.Input
          value={milestone.remarks ?? ''}
          placeholder={variant === 'listing' ? 'Enter remarks' : 'Type here...'}
          onChange={(event) => onUpdate('remarks', event.target.value)}
          className={variant === 'listing' ? 'text-paragraph-sm text-text-sub-500' : undefined}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

export default function ProjectPoScopePaymentMilestonesEditor({
  milestones,
  variant = 'form',
  onUpdateMilestone,
  onAddMilestone,
  onDeleteMilestone,
  className,
}) {
  const canDeleteMilestone = milestones.length > 1;
  const percentageTotal = getMilestonePercentageTotal(milestones);
  const totalsHundred = doMilestonesTotalHundred(milestones);
  const formattedTotal =
    percentageTotal === Math.trunc(percentageTotal)
      ? String(Math.trunc(percentageTotal))
      : String(Math.round(percentageTotal * 100) / 100);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className='flex items-center justify-between gap-3'>
        <span className='text-label-sm text-text-strong-950'>Payment Milestones</span>
        <span
          className={cn(
            'text-paragraph-xs',
            totalsHundred ? 'text-text-sub-500' : 'text-error-base',
          )}
        >
          Total {formattedTotal}%{totalsHundred ? '' : ' (must equal 100%)'}
        </span>
      </div>

      <div className='overflow-hidden rounded-xl border border-stroke-soft-200'>
        <Table.Root className='overflow-x-auto'>
          <Table.Header>
            <Table.Row>
              <Table.Head className='bg-bg-weak-100 px-3 py-2'>
                <MilestoneColumnHeader label='Milestone Name' sortable />
              </Table.Head>
              <Table.Head className='bg-bg-weak-100 px-3 py-2'>
                <MilestoneColumnHeader label='Payment Percentage' sortable />
              </Table.Head>
              <Table.Head className='bg-bg-weak-100 px-3 py-2'>
                <MilestoneColumnHeader label='Remarks' />
              </Table.Head>
              <Table.Head className='w-16 bg-bg-weak-100 px-3 py-2' />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {milestones.map((milestone) => (
              <React.Fragment key={milestone.id}>
                <Table.Row className='h-10'>
                  <Table.Cell className='px-3 py-2'>
                    <MilestoneNameCell
                      milestone={milestone}
                      variant={variant}
                      onUpdate={(field, value) => onUpdateMilestone(milestone.id, field, value)}
                    />
                  </Table.Cell>
                  <Table.Cell className='px-3 py-2'>
                    <MilestonePercentageCell
                      milestone={milestone}
                      onUpdate={(field, value) => onUpdateMilestone(milestone.id, field, value)}
                    />
                  </Table.Cell>
                  <Table.Cell className='px-3 py-2'>
                    <MilestoneRemarksCell
                      milestone={milestone}
                      variant={variant}
                      onUpdate={(field, value) => onUpdateMilestone(milestone.id, field, value)}
                    />
                  </Table.Cell>
                  <Table.Cell className='px-3 py-2 text-center'>
                    <button
                      type='button'
                      onClick={() => onDeleteMilestone(milestone.id)}
                      aria-label='Delete milestone'
                      disabled={!canDeleteMilestone}
                      className={cn(
                        'text-text-soft-400 transition hover:text-red-base disabled:pointer-events-none',
                        !canDeleteMilestone && 'opacity-0',
                      )}
                    >
                      <RiDeleteBin6Line className='size-5' />
                    </button>
                  </Table.Cell>
                </Table.Row>
                <Table.RowDivider />
              </React.Fragment>
            ))}

            <Table.Row className='bg-bg-weak-100'>
              <Table.Cell colSpan={4} className='px-3 py-2'>
                <button
                  type='button'
                  onClick={onAddMilestone}
                  className='flex items-center gap-3 text-label-sm text-text-sub-500 transition hover:text-text-strong-950'
                >
                  <span className='flex size-7 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
                    <RiAddLine className='size-4' />
                  </span>
                  Add Milestone
                </button>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
}
