import React, { useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpDownLine,
  RiArrowUpSLine,
  RiDeleteBinLine,
  RiSettings3Line,
} from 'react-icons/ri';
import * as Accordion from '@/components/ui/accordion';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Input from '@/components/ui/input';
import * as Modal from '@/components/ui/modal';
import { Datepicker } from '@/components/ui/datepicker';
import { PROJECT_DETAIL_COLLECTION_PLAN_DEFAULT } from '@/components/projects/constants';
import { cn } from '@/utils/cn';

const BOQ_TYPE_BADGE = {
  Original: { color: 'blue', label: 'Original' },
  Additional: { color: 'orange', label: 'Additional' },
  Design: { color: 'purple', label: 'Design' },
};

const BOQ_TYPE_SORT_ORDER = {
  Original: 0,
  main: 0,
  Design: 1,
  design: 1,
  Additional: 2,
  additional: 2,
};

function naturalSortKey(text) {
  return String(text || '')
    .split(/(\d+)/)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part.toLowerCase()));
}

function compareCollectionPlans(a, b) {
  const typeA = BOQ_TYPE_SORT_ORDER[a?.boq_type] ?? BOQ_TYPE_SORT_ORDER[a?.boq_source_type] ?? 99;
  const typeB = BOQ_TYPE_SORT_ORDER[b?.boq_type] ?? BOQ_TYPE_SORT_ORDER[b?.boq_source_type] ?? 99;
  if (typeA !== typeB) return typeA - typeB;

  const codeA = naturalSortKey(a?.boq_code);
  const codeB = naturalSortKey(b?.boq_code);
  for (let i = 0; i < Math.max(codeA.length, codeB.length); i += 1) {
    const left = codeA[i] ?? '';
    const right = codeB[i] ?? '';
    if (left === right) continue;
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return String(left).localeCompare(String(right));
  }

  return String(a?.boq_name || '').localeCompare(String(b?.boq_name || ''), undefined, {
    numeric: true,
  });
}

function formatCurrencyFromPercent(boqValue, paymentPercent) {
  const amount = Number(boqValue) || 0;
  const percent = Number(paymentPercent) || 0;
  if (!amount || !percent) return '—';
  const value = Math.round((amount * percent) / 100);
  return value.toLocaleString('en-IN');
}

function toDateInput(value) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toApiDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function createEmptyMilestone() {
  return {
    id: `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    payment_percent: '',
    expected_invoice_date: '',
    timeline: '',
    expected_pay_date: '',
    invoice_required: false,
    remark: '',
  };
}

function planToForm(plan) {
  if (!plan) {
    return {
      ...structuredClone(PROJECT_DETAIL_COLLECTION_PLAN_DEFAULT),
      collection_boq: '',
      project_boq: '',
      boq_type: '',
    };
  }
  return {
    collection_boq: plan.name,
    project_boq: plan.project_boq || '',
    boq_code: plan.boq_code || '',
    boq_name: plan.boq_name || '',
    boq_type: plan.boq_type || '',
    boq_value: String(plan.boq_value ?? plan.boq_value_display ?? ''),
    gst: String(plan.gst ?? '18'),
    tds: String(plan.tds ?? '1'),
    milestones: (plan.milestones || []).map((row) => ({
      id: row.id || createEmptyMilestone().id,
      name: row.name || '',
      payment_percent: String(row.payment_percent ?? ''),
      expected_invoice_date: row.expected_invoice_date || '',
      timeline: row.timeline || '',
      expected_pay_date: row.expected_pay_date || '',
      invoice_required: Boolean(row.invoice_required),
      remark: row.remark || '',
    })),
  };
}

function BoqTypeBadge({ value }) {
  const meta = BOQ_TYPE_BADGE[value] ?? { color: 'gray', label: value || '—' };
  return (
    <Badge.Root variant='light' color={meta.color} size='small'>
      {meta.label}
    </Badge.Root>
  );
}

function MilestoneTable({ form, onUpdateMilestone, onRemoveMilestone, onAddMilestone }) {
  return (
    <div className='min-w-0 space-y-3'>
      <div className='min-w-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <div className='min-w-0 overflow-x-auto'>
          <table className='w-full min-w-[1080px] border-collapse'>
            <thead className='bg-bg-weak-100'>
              <tr>
                {[
                  'Milestone Name',
                  'Payment (%)',
                  'Value (₹)',
                  'Exp. Inv. Date',
                  'Timeline (Days)',
                  'Exp. Pay Date',
                  'Inv. Req',
                  'Remarks',
                  '',
                ].map((label, index, labels) => (
                  <th
                    key={`${label}-${index}`}
                    className={cn(
                      'border-b border-stroke-soft-200 px-3 py-2 text-left',
                      index === labels.length - 1 &&
                        'sticky right-0 z-10 w-12 bg-bg-weak-100 shadow-[-8px_0_8px_-8px_rgba(14,18,27,0.08)]',
                    )}
                  >
                    <div className='flex items-center gap-0.5'>
                      <span className='text-label-sm whitespace-nowrap text-text-soft-400'>
                        {label}
                      </span>
                      {index === 1 || index === 2 ? (
                        <RiArrowUpDownLine className='size-4 text-text-soft-400' />
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.milestones || []).map((row) => (
                <tr key={row.id} className='border-b border-stroke-soft-200 last:border-b-0'>
                  <td className='px-3 py-2'>
                    <Input.Root size='xsmall'>
                      <Input.Wrapper>
                        <Input.Input
                          placeholder='Enter name'
                          value={row.name}
                          onChange={(event) =>
                            onUpdateMilestone(row.id, 'name', event.target.value)
                          }
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </td>
                  <td className='px-3 py-2'>
                    <Input.Root size='xsmall'>
                      <Input.Wrapper>
                        <Input.Input
                          placeholder='Enter percentage'
                          value={row.payment_percent}
                          onChange={(event) =>
                            onUpdateMilestone(row.id, 'payment_percent', event.target.value)
                          }
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </td>
                  <td className='px-3 py-2'>
                    <span className='text-paragraph-sm text-text-sub-500'>
                      {formatCurrencyFromPercent(form.boq_value, row.payment_percent)}
                    </span>
                  </td>
                  <td className='px-3 py-2'>
                    <Datepicker
                      value={toDateInput(row.expected_invoice_date)}
                      onChange={(date) =>
                        onUpdateMilestone(row.id, 'expected_invoice_date', date ?? null)
                      }
                      placeholder='DD/MM/YY'
                      size='xsmall'
                      variant='compact'
                    />
                  </td>
                  <td className='px-3 py-2'>
                    <Input.Root size='xsmall'>
                      <Input.Wrapper>
                        <Input.Input
                          placeholder='Enter days'
                          value={row.timeline}
                          onChange={(event) =>
                            onUpdateMilestone(row.id, 'timeline', event.target.value)
                          }
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </td>
                  <td className='px-3 py-2'>
                    <Datepicker
                      value={toDateInput(row.expected_pay_date)}
                      onChange={(date) =>
                        onUpdateMilestone(row.id, 'expected_pay_date', date ?? null)
                      }
                      placeholder='DD/MM/YY'
                      size='xsmall'
                      variant='compact'
                    />
                  </td>
                  <td className='px-3 py-2'>
                    <Checkbox.Root
                      checked={row.invoice_required}
                      onCheckedChange={(checked) =>
                        onUpdateMilestone(row.id, 'invoice_required', Boolean(checked))
                      }
                    />
                  </td>
                  <td className='px-3 py-2'>
                    <Input.Root size='xsmall'>
                      <Input.Wrapper>
                        <Input.Input
                          placeholder='Enter remark'
                          value={row.remark}
                          onChange={(event) =>
                            onUpdateMilestone(row.id, 'remark', event.target.value)
                          }
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </td>
                  <td className='sticky right-0 z-10 w-12 bg-bg-white-0 px-3 py-2 shadow-[-8px_0_8px_-8px_rgba(14,18,27,0.08)]'>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='ghost'
                      size='xsmall'
                      onClick={() => onRemoveMilestone(row.id)}
                      aria-label='Delete milestone'
                    >
                      <Button.Icon as={RiDeleteBinLine} />
                    </Button.Root>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Button.Root
        type='button'
        variant='neutral'
        mode='ghost'
        size='xsmall'
        onClick={onAddMilestone}
      >
        <Button.Icon as={RiAddLine} />
        Add New Milestone
      </Button.Root>
    </div>
  );
}

export default function ProjectCollectionSetupPlanModal({
  open,
  onOpenChange,
  onSave,
  plans = [],
  isSaving = false,
}) {
  const [formsById, setFormsById] = useState({});
  const [openItems, setOpenItems] = useState([]);

  const sortedPlans = useMemo(() => [...(plans || [])].sort(compareCollectionPlans), [plans]);
  const planIds = useMemo(
    () => sortedPlans.map((plan) => plan.name).filter(Boolean),
    [sortedPlans],
  );

  useEffect(() => {
    if (!open) return;
    const nextForms = {};
    for (const plan of sortedPlans) {
      if (!plan?.name) continue;
      nextForms[plan.name] = planToForm(plan);
    }
    setFormsById(nextForms);
    setOpenItems(planIds[0] ? [planIds[0]] : []);
  }, [open, sortedPlans, planIds]);

  const updatePlanField = (planId, field, value) => {
    setFormsById((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], [field]: value },
    }));
  };

  const updateMilestone = (planId, milestoneId, field, value) => {
    setFormsById((prev) => {
      const form = prev[planId];
      if (!form) return prev;
      return {
        ...prev,
        [planId]: {
          ...form,
          milestones: (form.milestones || []).map((row) => {
            if (row.id !== milestoneId) return row;
            const next = { ...row, [field]: value };

            // Auto-fill Exp. Pay Date = Exp. Inv. Date + Timeline (Days) when either changes.
            if (field === 'timeline' || field === 'expected_invoice_date') {
              const invoiceDate = toDateInput(
                field === 'expected_invoice_date' ? value : next.expected_invoice_date,
              );
              const days = Number(field === 'timeline' ? value : next.timeline);
              if (invoiceDate && Number.isFinite(days) && days > 0) {
                const payDate = new Date(invoiceDate);
                payDate.setDate(payDate.getDate() + days);
                next.expected_pay_date = payDate;
              }
            }
            return next;
          }),
        },
      };
    });
  };

  const addMilestone = (planId) => {
    setFormsById((prev) => {
      const form = prev[planId];
      if (!form) return prev;
      return {
        ...prev,
        [planId]: {
          ...form,
          milestones: [...(form.milestones || []), createEmptyMilestone()],
        },
      };
    });
  };

  const removeMilestone = (planId, milestoneId) => {
    setFormsById((prev) => {
      const form = prev[planId];
      if (!form) return prev;
      return {
        ...prev,
        [planId]: {
          ...form,
          milestones: (form.milestones || []).filter((row) => row.id !== milestoneId),
        },
      };
    });
  };

  const handleSave = () => {
    const payload = planIds
      .map((planId) => {
        const form = formsById[planId];
        if (!form) return null;
        return {
          ...form,
          collection_boq: planId,
          milestones: (form.milestones || []).map((row) => ({
            ...row,
            timeline_days: row.timeline || row.timeline_days || 0,
            expected_invoice_date: toApiDate(row.expected_invoice_date),
            expected_pay_date: toApiDate(row.expected_pay_date),
          })),
        };
      })
      .filter(Boolean);

    onSave?.(payload);
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className='flex max-h-[min(90dvh,calc(100dvh-32px))] w-full max-w-[min(1120px,calc(100vw-32px))] flex-col overflow-hidden'
        showClose
      >
        <Modal.Header
          className='shrink-0'
          icon={RiSettings3Line}
          title='Setup Collection Plan'
          description='Define payment milestones grouped by BOQ / billing reference'
        />

        <Modal.Body className='min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pt-2'>
          {planIds.length === 0 ? (
            <div className='rounded-xl border border-dashed border-stroke-soft-200 px-4 py-10 text-center text-paragraph-sm text-text-sub-500'>
              No collection BOQs available yet. Initiate a Client BOQ to Procurement to configure
              milestones here.
            </div>
          ) : (
            <Accordion.Root
              type='multiple'
              value={openItems}
              onValueChange={setOpenItems}
              className='min-w-0 space-y-3'
            >
              {planIds.map((planId) => {
                const form = formsById[planId];
                if (!form) return null;
                const title = form.boq_name || form.boq_code || planId;

                return (
                  <Accordion.Item
                    key={planId}
                    value={planId}
                    className={cn(
                      'min-w-0 overflow-hidden rounded-xl bg-bg-white-0 p-0 ring-1 ring-inset ring-stroke-soft-200',
                      'hover:bg-bg-white-0 hover:ring-stroke-soft-200',
                      'data-[state=open]:bg-bg-white-0 data-[state=open]:ring-stroke-soft-200',
                    )}
                  >
                    <Accordion.Header>
                      <Accordion.Trigger
                        className={cn(
                          'w-full -m-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl p-4',
                          'data-[state=open]:rounded-b-none data-[state=open]:bg-bg-weak-50',
                        )}
                      >
                        <div className='flex min-w-0 items-center gap-2.5'>
                          <span className='truncate text-label-sm text-text-strong-950'>
                            {title}
                          </span>
                          <BoqTypeBadge value={form.boq_type} />
                        </div>
                        <Accordion.Arrow openIcon={RiArrowDownSLine} closeIcon={RiArrowUpSLine} />
                      </Accordion.Trigger>
                    </Accordion.Header>

                    <Accordion.Content className='min-w-0 overflow-hidden px-4 pb-4 pt-0'>
                      <div className='min-w-0 space-y-4 border-t border-stroke-soft-200 pt-4'>
                        <div className='grid grid-cols-1 gap-3 md:grid-cols-12'>
                          <div className='md:col-span-3'>
                            <label className='mb-1 block text-label-sm text-text-sub-500'>
                              BOQ Code
                            </label>
                            <Input.Root size='xsmall'>
                              <Input.Wrapper>
                                <Input.Input value={form.boq_code} readOnly disabled />
                              </Input.Wrapper>
                            </Input.Root>
                          </div>
                          <div className='md:col-span-5'>
                            <label className='mb-1 block text-label-sm text-text-sub-500'>
                              BOQ Name
                            </label>
                            <Input.Root size='xsmall'>
                              <Input.Wrapper>
                                <Input.Input value={form.boq_name} readOnly disabled />
                              </Input.Wrapper>
                            </Input.Root>
                          </div>
                          <div className='md:col-span-2'>
                            <label className='mb-1 block text-label-sm text-text-sub-500'>
                              BOQ Value
                            </label>
                            <Input.Root size='xsmall'>
                              <Input.Wrapper>
                                <Input.Input value={form.boq_value} readOnly disabled />
                                <Input.Affix>₹</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          </div>
                          <div className='md:col-span-1'>
                            <label className='mb-1 block text-label-sm text-text-sub-500'>
                              GST
                            </label>
                            <Input.Root size='xsmall'>
                              <Input.Wrapper>
                                <Input.Input
                                  value={form.gst}
                                  onChange={(event) =>
                                    updatePlanField(planId, 'gst', event.target.value)
                                  }
                                />
                                <Input.Affix>%</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          </div>
                          <div className='md:col-span-1'>
                            <label className='mb-1 block text-label-sm text-text-sub-500'>
                              TDS
                            </label>
                            <Input.Root size='xsmall'>
                              <Input.Wrapper>
                                <Input.Input
                                  value={form.tds}
                                  onChange={(event) =>
                                    updatePlanField(planId, 'tds', event.target.value)
                                  }
                                />
                                <Input.Affix>%</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          </div>
                        </div>

                        <MilestoneTable
                          form={form}
                          onUpdateMilestone={(milestoneId, field, value) =>
                            updateMilestone(planId, milestoneId, field, value)
                          }
                          onRemoveMilestone={(milestoneId) => removeMilestone(planId, milestoneId)}
                          onAddMilestone={() => addMilestone(planId)}
                        />
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          )}
        </Modal.Body>

        <Modal.Footer className='shrink-0 justify-end gap-3'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange?.(false)}
            disabled={isSaving}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={handleSave}
            disabled={isSaving || planIds.length === 0}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
