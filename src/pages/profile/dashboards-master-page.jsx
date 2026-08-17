import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RiAddLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import DashboardMasterFormModal from '@/components/dashboard-master/dashboard-master-form-modal';
import DashboardRenameModal from '@/components/dashboard-master/dashboard-rename-modal';
import DashboardListCard from '@/components/dashboard-master/dashboard-list-card';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import {
  deleteDashboard,
  duplicateDashboard,
  listDashboards,
} from '@/services/dashboard-master-service';
import { canManageDashboardMaster } from '@/utils/user-role-utils';

function SettingsDashboardCard({ dashboard, onOpen, onContextMenu }) {
  return (
    <div className='relative' onContextMenu={(event) => onContextMenu(event, dashboard)}>
      <DashboardListCard dashboard={dashboard} onOpen={onOpen} />
    </div>
  );
}

export default function DashboardsMasterPage() {
  const navigate = useNavigate();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canManage = canManageDashboardMaster(userSideBarPerm);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [renamingDashboard, setRenamingDashboard] = useState(null);
  const [deletingDashboard, setDeletingDashboard] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { dashboards: nextDashboards } = await listDashboards();
      setDashboards(nextDashboards);
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

  const contextDashboard = contextMenu?.dashboard;

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextMenu = useCallback(
    (event, dashboard) => {
      if (!canManage) return;
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ x: event.clientX, y: event.clientY, dashboard });
    },
    [canManage],
  );

  const handleOpenCreate = () => {
    setEditingDashboard(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (dashboard) => {
    setEditingDashboard(dashboard);
    setFormOpen(true);
  };

  const handleSaved = () => {
    reload();
  };

  const handleConfirmDelete = async () => {
    if (!deletingDashboard) return;
    try {
      await deleteDashboard(deletingDashboard.dashboard_id);
      toast.success('Dashboard deleted');
      setDeletingDashboard(null);
      reload();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete dashboard');
    }
  };

  const handleDuplicate = async (dashboard) => {
    try {
      await duplicateDashboard(dashboard.dashboard_id);
      toast.success('Dashboard duplicated');
      reload();
    } catch (error) {
      toast.error(error?.message || 'Failed to duplicate dashboard');
    }
  };

  const handleOpen = (dashboard) => {
    navigate(`/settings/dashboards/${encodeURIComponent(dashboard.dashboard_id)}`);
  };

  return (
    <div className='flex h-full min-h-0 w-full min-w-0 flex-col gap-5 overflow-x-hidden'>
      <div className='flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 flex flex-col gap-1'>
          <div className='label-large text-text-strong-950'>Customised Dashboards</div>
          <div className='paragraph-small text-text-sub-500'>
            Create and manage dashboards for your modules
          </div>
        </div>
        {canManage && (
          <Button.Root
            size='medium'
            onClick={handleOpenCreate}
            className='shrink-0 gap-1 self-start'
          >
            <Button.Icon as={RiAddLine} />
            Create Dashboard
          </Button.Root>
        )}
      </div>

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
        <div className='py-10 text-center text-text-sub-500'>Loading dashboards…</div>
      ) : loadError ? (
        <div className='flex flex-col items-center gap-3 py-10 text-center'>
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
        <div className='py-10 text-center text-text-sub-500'>
          {search ? 'No dashboards match your search.' : 'No dashboards yet.'}
          {canManage && !search ? ' Create your first one.' : ''}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          {filtered.map((dashboard) => (
            <SettingsDashboardCard
              key={dashboard.dashboard_id}
              dashboard={dashboard}
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      )}

      <DashboardMasterFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingDashboard}
        onSaved={handleSaved}
      />

      <DashboardRenameModal
        open={Boolean(renamingDashboard)}
        onOpenChange={(open) => {
          if (!open) setRenamingDashboard(null);
        }}
        dashboard={renamingDashboard}
        onSaved={handleSaved}
      />

      {deletingDashboard && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingDashboard)}
          onOpenChange={(v) => (v ? null : setDeletingDashboard(null))}
          title='Delete dashboard?'
          description={`This will delete "${deletingDashboard.dashboard_name}" along with all its tabs and charts. This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
        />
      )}

      {contextDashboard && (
        <Dropdown.Root
          open={Boolean(contextMenu)}
          onOpenChange={(open) => {
            if (!open) closeContextMenu();
          }}
        >
          <Dropdown.Trigger asChild>
            <span
              className='fixed z-50 block h-px w-px'
              style={{ left: contextMenu.x, top: contextMenu.y }}
              aria-hidden='true'
            />
          </Dropdown.Trigger>
          <Dropdown.Content className='w-[190px] p-2' align='start'>
            <Dropdown.Item
              onSelect={() => {
                setRenamingDashboard(contextDashboard);
                closeContextMenu();
              }}
            >
              Rename
            </Dropdown.Item>
            <Dropdown.Item
              onSelect={() => {
                handleOpenEdit(contextDashboard);
                closeContextMenu();
              }}
            >
              Edit
            </Dropdown.Item>
            <Dropdown.Item
              onSelect={() => {
                handleDuplicate(contextDashboard);
                closeContextMenu();
              }}
            >
              Duplicate
            </Dropdown.Item>
            <Dropdown.Item
              className='text-error-base data-[highlighted]:text-error-base'
              onSelect={() => {
                setDeletingDashboard(contextDashboard);
                closeContextMenu();
              }}
            >
              Delete
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      )}
    </div>
  );
}
