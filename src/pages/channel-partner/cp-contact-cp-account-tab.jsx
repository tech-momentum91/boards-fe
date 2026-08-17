import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import { getSalesTeamUserList } from '@/api/crmAccounts';
import emptyState from '@/assets/images/empty-state.png';
import CpAccountsTable from './cp-accounts-table';

const CpContactCpAccountTab = ({ account, loading, error }) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [sorting, setSorting] = useState([]);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadSalesOwners = async () => {
      try {
        const response = await getSalesTeamUserList();
        if (!mounted) return;
        const normalized = Array.isArray(response)
          ? response
              .map((opt) => {
                if (typeof opt === 'string') {
                  return { value: opt, label: opt };
                }
                const value = opt?.value ?? opt?.name ?? opt?.email ?? '';
                const label = opt?.label ?? opt?.full_name ?? value;
                const email =
                  typeof opt?.email === 'string' && opt.email.trim() ? opt.email.trim() : '';
                return value ? { value, label, email } : null;
              })
              .filter(Boolean)
          : [];
        setSalesOwnerOptions(normalized);
      } catch {
        if (mounted) setSalesOwnerOptions([]);
      }
    };

    loadSalesOwners();
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewAccount = (row = account) => {
    if (!row?.id) return;
    navigate(`/channel-partner/accounts/${encodeURIComponent(row.id)}`);
  };

  const rows = useMemo(() => {
    if (!account) return [];
    const q = searchValue.trim().toLowerCase();
    if (!q) return [account];
    const fields = [
      account.legalName,
      account.brandName,
      account.salesOwner,
      account.website,
      account.type,
      account.industry,
      account.city,
      account.state,
    ];
    return fields.some((v) => (v || '').toLowerCase().includes(q)) ? [account] : [];
  }, [account, searchValue]);

  if (!loading && !error && !account) {
    return (
      <div className='flex h-full min-h-[360px] flex-col items-center justify-center bg-bg-white-0 p-16 text-center'>
        <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No CP account linked</h3>
        <p className='max-w-md text-sm text-text-sub-600'>
          This contact is not linked to a CP account. Link a CP account from the contact&apos;s
          About tab.
        </p>
      </div>
    );
  }

  return (
    <div className='flex h-full min-h-0 flex-col p-6'>
      <div className='mb-4 shrink-0'>
        <Input.Root className='w-full max-w-md'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search by name, website, sales owner'
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label='Search CP account'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        <CpAccountsTable
          rows={rows}
          isLoading={loading}
          error={error}
          variant='compact'
          sorting={sorting}
          onSortingChange={setSorting}
          tableId='cp-contact-cp-account-table'
          onRowSelect={handleViewAccount}
          showActions={false}
          emptyStateVariant={searchValue.trim() ? 'search' : 'default'}
          salesOwnerOptions={salesOwnerOptions}
        />
      </div>
    </div>
  );
};

export default CpContactCpAccountTab;
