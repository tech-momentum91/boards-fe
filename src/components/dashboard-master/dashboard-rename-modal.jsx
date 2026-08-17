import React, { useEffect, useState } from 'react';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

import { saveDashboard } from '@/services/dashboard-master-service';

export default function DashboardRenameModal({ open, onOpenChange, dashboard, onSaved }) {
  const [dashboardName, setDashboardName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDashboardName(dashboard?.dashboard_name || '');
  }, [open, dashboard]);

  const handleSave = async () => {
    if (!dashboardName.trim() || !dashboard) return;
    setSaving(true);
    try {
      await saveDashboard({
        dashboardId: dashboard.dashboard_id,
        dashboardName: dashboardName.trim(),
        icon: dashboard.icon,
        description: dashboard.description,
        dashboardType: dashboard.dashboard_type,
        module: dashboard.module,
        embedInModule: dashboard.embed_in_module,
        defaultTimeRange: dashboard.default_time_range,
        enabledFilters: dashboard.enabled_filters,
        visibility: dashboard.visibility ?? { roles: [], users: [] },
      });
      toast.success('Dashboard renamed');
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.message || 'Could not rename dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[420px]'>
        <Modal.Header title='Rename Dashboard' />
        <Modal.Body className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <Label.Root>
              Dashboard Name
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Dashboard name'
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  autoFocus
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='medium'
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button.Root>
          <Button.Root
            size='medium'
            onClick={handleSave}
            disabled={saving || !dashboardName.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
