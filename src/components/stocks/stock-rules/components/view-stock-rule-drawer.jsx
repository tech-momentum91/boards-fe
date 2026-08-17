import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RiArrowDownCircleLine,
  RiArrowLeftCircleLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpCircleLine,
  RiBox3Line,
  RiBuilding4Line,
  RiCloseLine,
  RiFile3Line,
  RiInformationLine,
  RiPriceTag3Line,
  RiRefreshLine,
  RiRulerLine,
  RiTimeLine,
} from 'react-icons/ri';

import {
  STOCKS_RULE_CONSUMPTION_OPTIONS,
  STOCKS_RULE_FREQUENCY_OPTIONS,
} from '@/components/stocks/constants';
import {
  parseStockRuleBooleanFlag,
  getStockRuleCenterLabel,
} from '@/components/stocks/shared/api/core-api';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Textarea from '@/components/ui/textarea';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import { InlineFieldInput, InlineFieldSelect } from '@/components/stocks/stocks-helper';

function getFieldValue(rule, localChanges, fieldName) {
  if (fieldName === 'critical' || fieldName === 'fifo') {
    const raw =
      localChanges[fieldName] !== undefined && localChanges[fieldName] !== null
        ? localChanges[fieldName]
        : rule?.[fieldName];
    return parseStockRuleBooleanFlag(raw);
  }
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }
  if (rule?.[fieldName] !== undefined && rule?.[fieldName] !== null && rule?.[fieldName] !== '') {
    return rule[fieldName];
  }
  return '';
}

function normalizeForCompare(fieldName, value) {
  if (fieldName === 'critical' || fieldName === 'fifo') {
    return parseStockRuleBooleanFlag(value);
  }
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

const ViewStockRuleDrawer = ({ open, onOpenChange, rule, onUpdateRule }) => {
  const updateQueueRef = useRef(Promise.resolve());
  const notesDebounceRef = useRef(null);
  const previousRuleIdRef = useRef(null);

  const [localChanges, setLocalChanges] = useState({});

  const rowId = rule?.row_id ?? rule?.id;

  const handleClose = () => onOpenChange(false);

  const getOriginalFieldValue = useCallback(
    (fieldName) => getFieldValue(rule, {}, fieldName),
    [rule],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      if (!rowId || !onUpdateRule) return;

      const currentValue = getOriginalFieldValue(fieldName);
      if (normalizeForCompare(fieldName, currentValue) === normalizeForCompare(fieldName, value)) {
        return;
      }

      setLocalChanges((previous) => ({
        ...previous,
        [fieldName]: value,
      }));

      updateQueueRef.current = updateQueueRef.current
        .catch(() => {})
        .then(() => onUpdateRule(rowId, { [fieldName]: value }));
    },
    [rowId, onUpdateRule, getOriginalFieldValue],
  );

  const handleNotesChange = useCallback(
    (value) => {
      setLocalChanges((previous) => ({
        ...previous,
        notes: value,
      }));

      if (!rowId || !onUpdateRule) return;
      if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);

      notesDebounceRef.current = window.setTimeout(() => {
        const currentValue = getOriginalFieldValue('notes');
        if (normalizeForCompare('notes', currentValue) === normalizeForCompare('notes', value)) {
          return;
        }

        updateQueueRef.current = updateQueueRef.current
          .catch(() => {})
          .then(() => onUpdateRule(rowId, { notes: value }));
      }, 500);
    },
    [rowId, onUpdateRule, getOriginalFieldValue],
  );

  useEffect(() => {
    if (!open) {
      if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
      setLocalChanges({});
      updateQueueRef.current = Promise.resolve();
      previousRuleIdRef.current = null;
      return;
    }

    const id = rowId;
    if (previousRuleIdRef.current !== id) {
      if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
      previousRuleIdRef.current = id;
      setLocalChanges({});
      updateQueueRef.current = Promise.resolve();
    }
  }, [open, rowId]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[600px]'>
        <Drawer.Header
          className='sticky top-0 z-10 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-3'
          showCloseButton={false}
        >
          <div className='flex w-full items-center justify-between'>
            <div className='flex items-center gap-1'>
              <Button.Root type='button' variant='neutral' mode='stroke' size='xsmall'>
                <Button.Icon as={RiArrowLeftSLine} />
              </Button.Root>
              <Button.Root type='button' variant='neutral' mode='stroke' size='xsmall'>
                <Button.Icon as={RiArrowRightSLine} />
              </Button.Root>
            </div>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={handleClose}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='overflow-y-auto py-4'>
          <div className='flex flex-col gap-4 px-4'>
            <div className='rounded-lg bg-bg-weak-50 px-3 py-2'>
              <p className='text-title-h6 text-text-strong-950'>
                {getFieldValue(rule, localChanges, 'product') || '--'}
              </p>
            </div>

            <section className='flex flex-col gap-2'>
              <div className='flex items-center gap-2 text-label-sm text-text-main-900'>
                <RiInformationLine className='size-4 text-text-sub-600' />
                Basic Information
              </div>
              <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                <div className='divide-y divide-stroke-soft-200'>
                  <FieldRow icon={RiBuilding4Line} label='Center' required className='bg-[#F6F8FA]'>
                    <span className='paragraph-small text-text-sub-600'>
                      {getStockRuleCenterLabel({ ...rule, ...localChanges }) || '--'}
                    </span>
                  </FieldRow>
                  <FieldRow
                    icon={RiPriceTag3Line}
                    label='Category'
                    required
                    className='bg-[#F6F8FA]'
                  >
                    <span className='paragraph-small text-text-sub-600'>
                      {getFieldValue(rule, localChanges, 'category') || '--'}
                    </span>
                  </FieldRow>
                  <FieldRow icon={RiBox3Line} label='Product' required className='bg-[#F6F8FA]'>
                    <span className='paragraph-small text-text-sub-600'>
                      {getFieldValue(rule, localChanges, 'product') || '--'}
                    </span>
                  </FieldRow>
                  <FieldRow icon={RiRulerLine} label='Unit' required className='bg-[#F6F8FA]'>
                    <span className='paragraph-small text-text-sub-600'>
                      {getFieldValue(rule, localChanges, 'unit') || '--'}
                    </span>
                  </FieldRow>
                  <FieldRow
                    icon={RiArrowDownCircleLine}
                    label='Min Level'
                    required
                    className='bg-[#F6F8FA]'
                  >
                    <InlineFieldInput
                      type='number'
                      min={0}
                      value={getFieldValue(rule, localChanges, 'min')}
                      onChange={(event) => handleFieldChange('min', event.target.value)}
                      placeholder='-'
                    />
                  </FieldRow>
                  <FieldRow
                    icon={RiRefreshLine}
                    label='Reorder Trigger'
                    required
                    className='bg-[#F6F8FA]'
                  >
                    <InlineFieldInput
                      type='number'
                      min={0}
                      value={getFieldValue(rule, localChanges, 'trigger')}
                      onChange={(event) => handleFieldChange('trigger', event.target.value)}
                      placeholder='-'
                    />
                  </FieldRow>
                  <FieldRow
                    icon={RiArrowUpCircleLine}
                    label='Target Value'
                    required
                    className='bg-[#F6F8FA]'
                  >
                    <InlineFieldInput
                      type='number'
                      min={0}
                      value={getFieldValue(rule, localChanges, 'target')}
                      onChange={(event) => handleFieldChange('target', event.target.value)}
                      placeholder='-'
                    />
                  </FieldRow>
                  <FieldRow
                    icon={RiRefreshLine}
                    label='Reorder Qty'
                    required
                    className='bg-[#F6F8FA]'
                  >
                    <InlineFieldInput
                      type='number'
                      min={0}
                      value={getFieldValue(rule, localChanges, 'reorderQty')}
                      onChange={(event) => handleFieldChange('reorderQty', event.target.value)}
                      placeholder='-'
                    />
                  </FieldRow>
                  <FieldRow
                    icon={RiArrowLeftCircleLine}
                    label='Consumption'
                    required
                    className='bg-[#F6F8FA]'
                  >
                    <InlineFieldSelect
                      value={getFieldValue(rule, localChanges, 'consumption')}
                      onValueChange={(value) => handleFieldChange('consumption', value)}
                      options={STOCKS_RULE_CONSUMPTION_OPTIONS}
                    />
                  </FieldRow>
                  <FieldRow icon={RiTimeLine} label='Frequency' required className='bg-[#F6F8FA]'>
                    <InlineFieldSelect
                      value={getFieldValue(rule, localChanges, 'frequency')}
                      onValueChange={(value) => handleFieldChange('frequency', value)}
                      options={STOCKS_RULE_FREQUENCY_OPTIONS}
                    />
                  </FieldRow>
                  <FieldRow icon={RiInformationLine} label='FIFO' className='bg-[#F6F8FA]'>
                    <Checkbox.Root
                      checked={getFieldValue(rule, localChanges, 'fifo')}
                      onCheckedChange={(checked) => handleFieldChange('fifo', checked === true)}
                      aria-label='FIFO (first in, first out)'
                    />
                  </FieldRow>
                  <FieldRow
                    icon={RiInformationLine}
                    label='Critical'
                    required
                    className='bg-[#F6F8FA]'
                  >
                    <Checkbox.Root
                      checked={getFieldValue(rule, localChanges, 'critical')}
                      onCheckedChange={(checked) => handleFieldChange('critical', checked === true)}
                    />
                  </FieldRow>
                </div>
              </div>
            </section>

            <section className='space-y-2'>
              <div className='flex items-center gap-2 text-label-sm text-text-main-900'>
                <RiFile3Line className='size-4 text-text-sub-600' />
                Notes
              </div>
              <Textarea.Root
                simple
                value={getFieldValue(rule, localChanges, 'notes')}
                placeholder='Add notes'
                rows={4}
                onChange={(event) => handleNotesChange(event.target.value)}
              />
            </section>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ViewStockRuleDrawer;
