import React from 'react';
import { RiAddLine } from 'react-icons/ri';

import * as Select from '@/components/ui/select';
import FilterRuleRow from './filter-rule-row';
import { createGroup, createRule } from './filter-model';

const SELECT_CONTENT_CLASS = 'z-[250] max-h-[min(320px,60vh)]';

/**
 * Recursive filter group. Renders its rules/nested groups top-to-bottom.
 */
export default function FilterGroup({
  group,
  depth = 0,
  fieldOptions,
  getValueOptions,
  searchValueOptions,
  onChange,
  onRemove,
  isFirstInParent = true,
  siblingOp = 'AND',
  onSiblingOpChange,
}) {
  const setChild = (idx, child) => {
    const nextChildren = [...group.children];
    if (child == null) nextChildren.splice(idx, 1);
    else nextChildren[idx] = child;
    onChange({ ...group, children: nextChildren });
  };

  const addRule = () => {
    onChange({ ...group, children: [...group.children, createRule()] });
  };

  const addNestedGroup = () => {
    onChange({
      ...group,
      children: [
        ...group.children,
        createGroup({
          op: group.op === 'AND' ? 'OR' : 'AND',
          children: [createRule(), createRule()],
        }),
      ],
    });
  };

  const setGroupOp = (op) => onChange({ ...group, op });

  const isNested = depth > 0;
  const nestedIndent = isNested ? 'pl-0' : 'pl-[80px]';

  const inner = (
    <div className='flex w-full min-w-0 flex-col gap-3'>
      {group.children.map((child, idx) => {
        if (child.kind === 'group') {
          return (
            <FilterGroup
              key={child.id}
              group={child}
              depth={depth + 1}
              isFirstInParent={idx === 0}
              siblingOp={group.op}
              onSiblingOpChange={setGroupOp}
              fieldOptions={fieldOptions}
              getValueOptions={getValueOptions}
              searchValueOptions={searchValueOptions}
              onChange={(next) => setChild(idx, next)}
              onRemove={() => setChild(idx, null)}
            />
          );
        }
        return (
          <FilterRuleRow
            key={child.id}
            rule={child}
            isFirstInGroup={idx === 0}
            groupOp={group.op}
            onGroupOpChange={setGroupOp}
            fieldOptions={fieldOptions}
            getValueOptions={getValueOptions}
            searchValueOptions={searchValueOptions}
            onChange={(next) => setChild(idx, next)}
            onRemove={() => setChild(idx, null)}
            nested={isNested}
          />
        );
      })}

      {depth < 2 && group.children.length > 0 && (
        <button
          type='button'
          onClick={addNestedGroup}
          className={`self-start paragraph-xsmall text-text-sub-500 hover:text-text-strong-950 ${nestedIndent}`}
        >
          Add nested filter
        </button>
      )}
    </div>
  );

  if (depth === 0) {
    return (
      <div className='flex w-full min-w-0 flex-col gap-2'>
        {inner}
        <div className='pt-1'>
          <button
            type='button'
            onClick={addRule}
            className='inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 label-small text-text-strong-950 hover:bg-bg-weak-50'
          >
            <RiAddLine className='size-4' />
            Add filter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-w-0'>
      {!isFirstInParent && (
        <div className='mb-2'>
          <Select.Root value={siblingOp} onValueChange={onSiblingOpChange} size='xsmall'>
            <Select.Trigger className='h-8 w-[72px]'>
              <Select.Value />
            </Select.Trigger>
            <Select.Content className={SELECT_CONTENT_CLASS}>
              <Select.Item value='AND'>AND</Select.Item>
              <Select.Item value='OR'>OR</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      )}

      <div className='relative w-full min-w-0 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 p-3'>
        {onRemove && (
          <button
            type='button'
            onClick={onRemove}
            className='absolute right-2 top-2 rounded p-1 text-text-sub-500 hover:bg-bg-white-0 hover:text-error-base'
            aria-label='Remove nested filter group'
          >
            ×
          </button>
        )}
        <div className={onRemove ? 'pr-6' : undefined}>{inner}</div>
      </div>
    </div>
  );
}
