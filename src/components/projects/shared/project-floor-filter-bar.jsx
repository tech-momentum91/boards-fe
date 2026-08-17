import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Input from '@/components/ui/input';
import { getProjectFloorFilterOptions, parseProjectFloors } from '@/components/projects/shared';
import { addProjectFloor } from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

export default function ProjectFloorFilterBar({
  projectId,
  projectDetail,
  floorFilter,
  onFloorFilterChange,
  size = 'xsmall',
}) {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const [isAddingFloor, setIsAddingFloor] = useState(false);
  const [newFloorValue, setNewFloorValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const options = useMemo(
    () => getProjectFloorFilterOptions(parseProjectFloors(projectDetail)),
    [projectDetail],
  );

  useEffect(() => {
    if (!isAddingFloor) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isAddingFloor]);

  const resetAddFloor = useCallback(() => {
    setIsAddingFloor(false);
    setNewFloorValue('');
  }, []);

  const submitNewFloor = useCallback(async () => {
    const trimmed = newFloorValue.trim();
    if (!trimmed || !projectId || isSaving) {
      if (!trimmed) resetAddFloor();
      return;
    }

    setIsSaving(true);
    try {
      const result = await dispatch(
        addProjectFloor({
          projectId,
          floor: trimmed,
          project: projectDetail,
        }),
      ).unwrap();

      showSuccessToast('Floor added successfully');
      onFloorFilterChange?.(result.floor);
      resetAddFloor();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [
    dispatch,
    isSaving,
    newFloorValue,
    onFloorFilterChange,
    projectDetail,
    projectId,
    resetAddFloor,
  ]);

  return (
    <div className='flex items-center'>
      <ButtonGroup.Root size={size}>
        {options.map((filter) => {
          const isActive = floorFilter === filter.id;
          return (
            <ButtonGroup.Item
              key={filter.id}
              data-state={isActive ? 'on' : 'off'}
              onClick={() => onFloorFilterChange?.(filter.id)}
              className={cn(
                isActive &&
                  'z-[1] bg-primary-alpha-10 text-primary-base ring-primary-base hover:bg-primary-alpha-10',
              )}
            >
              {filter.label}
            </ButtonGroup.Item>
          );
        })}

        {isAddingFloor ? (
          <div
            className={cn(
              'relative flex h-8 items-center rounded-r-lg bg-bg-white-0',
              'ring-1 ring-inset ring-stroke-soft-200',
            )}
          >
            <Input.Root size='xsmall' variant='border' className='w-[100px] h-[95%]'>
              <Input.Wrapper className='pl-2'>
                <Input.Input
                  ref={inputRef}
                  value={newFloorValue}
                  disabled={isSaving}
                  placeholder='Enter floor'
                  onChange={(event) => setNewFloorValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitNewFloor();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      resetAddFloor();
                    }
                  }}
                  onBlur={() => {
                    if (!newFloorValue.trim()) resetAddFloor();
                  }}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        ) : (
          <ButtonGroup.Item
            type='button'
            onClick={() => setIsAddingFloor(true)}
            className='gap-1 bg-bg-weak-50 text-text-sub-500 hover:bg-bg-weak-100'
          >
            <RiAddLine className='size-4' />
            New Floor
          </ButtonGroup.Item>
        )}
      </ButtonGroup.Root>
    </div>
  );
}
