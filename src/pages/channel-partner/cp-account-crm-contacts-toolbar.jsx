import React, { useEffect, useRef, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import TableVariantToggle from '@/components/ui/table-variant-toggle';

const SEARCH_PLACEHOLDER = 'Search by contact name, account, email';

const CpAccountCrmContactsToolbar = ({
  search,
  onSearchChange,
  tableVariant,
  onTableVariantToggle,
}) => {
  const [searchValue, setSearchValue] = useState(search || '');
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    setSearchValue(search || '');
  }, [search]);

  const handleSearch = ({ target: { value } }) => {
    setSearchValue(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => onSearchChange?.(value), 500);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <Input.Root className='w-full lg:w-[420px]'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder={SEARCH_PLACEHOLDER}
            value={searchValue}
            onChange={handleSearch}
            aria-label='Search CRM contacts'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex items-center gap-3'>
        {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className='inline-flex'>
              <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
        </Tooltip.Root> */}
      </div>
    </header>
  );
};

export default CpAccountCrmContactsToolbar;
