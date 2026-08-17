import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiSearchLine, RiCheckLine, RiFlashlightLine } from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Switch from '@/components/ui/switch';
import * as Textarea from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import {
  DASHBOARD_TYPES,
  DEFAULT_TIME_RANGES,
  listVisibilityOptions,
  saveDashboard,
} from '@/services/dashboard-master-service';
import IconSelectorModal from '@/components/dashboard-master/icon-selector-modal';
import { DashboardIcon } from '@/components/dashboard-master/dashboard-icon-utils.jsx';

const EMPTY_VISIBILITY = { roles: [], users: [] };

const emptyForm = () => ({
  dashboardName: '',
  icon: '',
  description: '',
  dashboardType: 'Operational',
  module: '',
  embedInModule: false,
  defaultTimeRange: 'Last 30 Days',
  visibility: { ...EMPTY_VISIBILITY },
});

// ── Visibility picker (unchanged logic) ────────────────────────────────────

function VisibilityPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState({ roles: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const selectedRoles = new Set(value?.roles ?? []);
  const selectedUsers = new Set(value?.users ?? []);
  const selectionCount = selectedRoles.size + selectedUsers.size;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listVisibilityOptions({ search, limit: 25 })
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setOptions({ roles: [], users: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, open]);

  const toggleRole = (role) => {
    const next = new Set(selectedRoles);
    next.has(role) ? next.delete(role) : next.add(role);
    onChange({ roles: [...next], users: [...selectedUsers] });
  };

  const toggleUser = (user) => {
    const next = new Set(selectedUsers);
    next.has(user) ? next.delete(user) : next.add(user);
    onChange({ roles: [...selectedRoles], users: [...next] });
  };

  return (
    <div className='w-full flex flex-col gap-2'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex items-center justify-between w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-left text-sm hover:bg-bg-weak-50 transition-colors'
      >
        <span className='text-text-strong-950'>
          {selectionCount === 0 ? 'Visible to everyone' : `${selectionCount} selected`}
        </span>
        <span className='text-text-soft-400 text-xs'>{open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className='rounded-lg border border-stroke-soft-200 p-3 flex flex-col gap-3 bg-bg-white-0 shadow-sm'>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder='Search roles or users…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>

          <div className='flex flex-col gap-1'>
            <div className='text-xs uppercase tracking-wide text-text-soft-400'>Roles</div>
            <div className='flex flex-col max-h-[140px] overflow-y-auto'>
              {loading && <div className='text-xs text-text-soft-400 px-2 py-1'>Loading…</div>}
              {!loading && options.roles.length === 0 && (
                <div className='text-xs text-text-soft-400 px-2 py-1'>No roles</div>
              )}
              {options.roles.map((role) => {
                const selected = selectedRoles.has(role);
                return (
                  <button
                    key={role}
                    type='button'
                    onClick={() => toggleRole(role)}
                    className='flex items-center justify-between px-2 py-1.5 text-sm text-text-strong-950 rounded hover:bg-bg-weak-50'
                  >
                    <span>{role}</span>
                    {selected && <RiCheckLine className='text-primary-base' />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='flex flex-col gap-1'>
            <div className='text-xs uppercase tracking-wide text-text-soft-400'>People</div>
            <div className='flex flex-col max-h-[160px] overflow-y-auto'>
              {loading && <div className='text-xs text-text-soft-400 px-2 py-1'>Loading…</div>}
              {!loading && options.users.length === 0 && (
                <div className='text-xs text-text-soft-400 px-2 py-1'>No users</div>
              )}
              {options.users.map((user) => {
                const selected = selectedUsers.has(user.id);
                const label = user.full_name || user.email || user.id;
                return (
                  <button
                    key={user.id}
                    type='button'
                    onClick={() => toggleUser(user.id)}
                    className='flex items-center justify-between px-2 py-1.5 text-sm text-text-strong-950 rounded hover:bg-bg-weak-50'
                  >
                    <span className='flex flex-col text-left'>
                      <span>{label}</span>
                      {user.email && user.email !== label && (
                        <span className='text-xs text-text-soft-400'>{user.email}</span>
                      )}
                    </span>
                    {selected && <RiCheckLine className='text-primary-base' />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='text-xs text-text-soft-400 pt-1 border-t border-stroke-soft-200'>
            Empty selection means every user in the organisation can see this dashboard.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main drawer ─────────────────────────────────────────────────────────────

export default function DashboardMasterFormModal({ open, onOpenChange, initialValue, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [iconSelectorOpen, setIconSelectorOpen] = useState(false);

  const isEdit = Boolean(initialValue?.dashboard_id);

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setForm({
        dashboardName: initialValue.dashboard_name || '',
        icon: initialValue.icon || '',
        description: initialValue.description || '',
        dashboardType: initialValue.dashboard_type || 'Operational',
        module: initialValue.module || '',
        embedInModule: Boolean(initialValue.embed_in_module),
        defaultTimeRange: initialValue.default_time_range || 'Last 30 Days',
        visibility: initialValue.visibility || { ...EMPTY_VISIBILITY },
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initialValue]);

  const canSave = useMemo(() => form.dashboardName.trim().length > 0 && !saving, [form, saving]);
  const update = useCallback((patch) => setForm((prev) => ({ ...prev, ...patch })), []);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = await saveDashboard({
        dashboardId: initialValue?.dashboard_id ?? null,
        dashboardName: form.dashboardName.trim(),
        icon: form.icon.trim(),
        description: form.description,
        dashboardType: form.dashboardType,
        module: form.module?.trim() || null,
        embedInModule: form.embedInModule,
        defaultTimeRange: form.defaultTimeRange,
        visibility: form.visibility,
      });
      toast.success(isEdit ? 'Dashboard updated' : 'Dashboard created');
      onSaved?.(saved);
      onOpenChange?.(false);
    } catch (error) {
      toast.error(error?.message || 'Could not save dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[600px] flex flex-col'>
        {/* ── Header ── */}
        <Drawer.Header className='relative flex items-start gap-4 px-8 py-6 shrink-0 pr-14'>
          {/* Plus icon in bordered circle */}
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0'>
            <RiAddLine className='size-5 text-text-sub-500' />
          </div>
          <div className='flex flex-col gap-1 pt-0.5'>
            <Drawer.Title className='label-medium text-text-strong-950'>
              {isEdit ? 'Edit Dashboard' : 'Create New Dashboard'}
            </Drawer.Title>
            <p className='paragraph-small text-text-sub-500'>
              Configure your dashboard properties and visibility
            </p>
          </div>
        </Drawer.Header>

        {/* ── Body ── */}
        <Drawer.Body className='flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5'>
          {/* Dashboard Name */}
          <div className='flex flex-col gap-1.5'>
            <Label.Root>
              Dashboard Name
              <Label.Asterisk />
            </Label.Root>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setIconSelectorOpen(true)}
                className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50 transition-colors text-text-sub-500'
                aria-label='Choose dashboard icon'
              >
                {form.icon ? (
                  <DashboardIcon iconId={form.icon} className='size-5 text-primary-base' />
                ) : (
                  <RiFlashlightLine className='size-5' />
                )}
              </button>
              <Input.Root size='medium' className='flex-1'>
                <Input.Wrapper>
                  <Input.Input
                    placeholder='e.g., Sales Overview'
                    value={form.dashboardName}
                    onChange={(e) => update({ dashboardName: e.target.value })}
                    autoFocus
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>

          {/* Description */}
          <div className='flex flex-col gap-1.5'>
            <Label.Root>Description</Label.Root>
            <Textarea.Root
              placeholder='What is this dashboard for?'
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={4}
            />
          </div>

          {/* Dashboard Type */}
          <div className='flex flex-col gap-1.5'>
            <Label.Root>Dashboard Type</Label.Root>
            <Select.Root
              value={form.dashboardType}
              onValueChange={(v) => update({ dashboardType: v })}
              size='medium'
            >
              <Select.Trigger>
                <Select.Value placeholder='What is this dashboard for?' />
              </Select.Trigger>
              <Select.Content>
                {DASHBOARD_TYPES.map((t) => (
                  <Select.Item key={t} value={t}>
                    {t}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          {/* Module */}
          <div className='flex flex-col gap-1.5'>
            <Label.Root>Module</Label.Root>
            <Select.Root
              value={form.module}
              onValueChange={(v) => update({ module: v })}
              size='medium'
            >
              <Select.Trigger>
                <Select.Value placeholder='Finance, Centres, Spaces' />
              </Select.Trigger>
              <Select.Content>
                {['Finance', 'Centres', 'Spaces', 'CRM', 'Operations', 'HR'].map((m) => (
                  <Select.Item key={m} value={m}>
                    {m}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          {/* Visibility Settings */}
          <div className='flex flex-col gap-1.5'>
            <Label.Root>
              Visibility Settings
              <Label.Asterisk />
            </Label.Root>
            <VisibilityPicker
              value={form.visibility}
              onChange={(visibility) => update({ visibility })}
            />
          </div>

          {/* Embed in Module */}
          <div className='flex items-center justify-between py-1'>
            <Label.Root className='!mb-0'>Embed in Module</Label.Root>
            <Switch.Root
              checked={form.embedInModule}
              onCheckedChange={(v) => update({ embedInModule: Boolean(v) })}
            />
          </div>

          {/* Default Time Range */}
          <div className='flex flex-col gap-1.5'>
            <Label.Root>Default Time Range</Label.Root>
            <Select.Root
              value={form.defaultTimeRange}
              onValueChange={(v) => update({ defaultTimeRange: v })}
              size='medium'
            >
              <Select.Trigger>
                <Select.Value placeholder='Last 30 days' />
              </Select.Trigger>
              <Select.Content>
                {DEFAULT_TIME_RANGES.map((t) => (
                  <Select.Item key={t} value={t}>
                    {t}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </Drawer.Body>

        {/* ── Footer ── */}
        <Drawer.Footer className='flex items-center justify-end gap-3 border-t border-stroke-soft-200 px-8 py-5 shrink-0'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='medium'
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
          >
            Cancel
          </Button.Root>
          <Button.Root size='medium' onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Dashboard'}
          </Button.Root>
        </Drawer.Footer>
      </Drawer.Content>

      <IconSelectorModal
        open={iconSelectorOpen}
        onOpenChange={setIconSelectorOpen}
        value={form.icon}
        onChange={(icon) => update({ icon })}
      />
    </Drawer.Root>
  );
}
