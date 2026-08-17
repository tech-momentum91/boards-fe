import React from 'react';
import { useSelector } from 'react-redux';
import { hasModulePermission } from '@/utils/user-role-utils';
import * as Button from '@/components/ui/button';
import { RiAddLine, RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import { treeifyError } from 'zod/v4/core';

const CenterViewCommonLayout = ({
  title,
  buttonName,
  children,
  onButtonClick,
  showButton,
  Icon,
  headerActions,
  searchValue = '',
  showSearch = true,
  onSearchChange,
}) => {
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');

  return (
    <div className='w-full   flex gap-[20px] flex-col items-start justify-center'>
      <div className='w-full flex items-center justify-between'>
        {showSearch && (
          <Input.Root className='w-full lg:w-[372px]'>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine />
              </Input.Icon>
              <Input.Input
                placeholder={title}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                aria-label={`Search ${title || ''}`}
              />
            </Input.Wrapper>
          </Input.Root>
        )}
        <div />
        <div className='flex items-center gap-3'>
          {headerActions}
          {canWrite && showButton && (
            <Button.Root
              className='gap-2'
              variant='primary'
              mode='filled'
              size='small'
              onClick={onButtonClick}
            >
              <Button.Icon as={RiAddLine} />
              {buttonName}
            </Button.Root>
          )}
        </div>
      </div>

      <div className='w-full'>{children}</div>
    </div>
  );
};

export default CenterViewCommonLayout;
