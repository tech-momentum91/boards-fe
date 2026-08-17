import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiSearchLine } from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import * as Input from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import DashboardListCard from '@/components/dashboard-master/dashboard-list-card';
import { listDashboards } from '@/services/dashboard-master-service';

export default function DashboardPickerPage() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { dashboards } = await listDashboards();
      setDashboards(dashboards);
    } catch (error) {
      const message = error?.message || 'Failed to load dashboards';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dashboards;
    return dashboards.filter((d) =>
      [d.dashboard_name, d.description, d.dashboard_type, d.module]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [dashboards, search]);

  const handleOpen = (dashboard) => {
    navigate(`/dashboards/${encodeURIComponent(dashboard.dashboard_id)}`);
  };

  return (
    <PageLayout
      pageTitle='Dashboards'
      pageDescription='Select a dashboard to view charts and insights.'
      contentAreaClassName='overflow-hidden'
    >
      <div className='flex h-full min-h-0 w-full min-w-0 flex-col gap-5 overflow-y-auto overflow-x-hidden px-8 pb-8'>
        <div className='max-w-[372px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder='Search Dashboards...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        {loading ? (
          <div className='py-16 text-center text-text-sub-500'>Loading dashboards…</div>
        ) : loadError ? (
          <div className='flex flex-col items-center gap-3 py-16 text-center'>
            <div className='text-text-sub-500'>{loadError}</div>
            <button
              type='button'
              className='paragraph-small text-primary-base underline'
              onClick={reload}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className='py-16 text-center text-text-sub-500'>
            {search ? 'No dashboards match your search.' : 'No dashboards available yet.'}
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            {filtered.map((dashboard) => (
              <DashboardListCard
                key={dashboard.dashboard_id}
                dashboard={dashboard}
                onOpen={handleOpen}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
