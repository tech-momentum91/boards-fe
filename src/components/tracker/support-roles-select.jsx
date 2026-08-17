import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { RiSearchLine } from 'react-icons/ri';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import apiClient from '@/api';

const normalizeGetRolesMessage = (message) => {
  if (message == null) return {};
  if (typeof message === 'object' && !Array.isArray(message)) {
    const entries = Object.entries(message);
    const looksGrouped = entries.some(([, v]) => Array.isArray(v));
    if (looksGrouped) {
      const out = {};
      entries.forEach(([key, v]) => {
        out[key] = Array.isArray(v) ? v.map((r) => String(r ?? '').trim()).filter(Boolean) : [];
      });
      return out;
    }
  }
  const list = Array.isArray(message) ? message : [];
  const names = list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return String(item.name ?? item.role ?? item.role_name ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
  if (names.length === 0) return {};
  return { Roles: [...new Set(names)] };
};

const mergeOrphanSelectedRole = (groupedRoles, selectedRole) => {
  const base =
    groupedRoles && typeof groupedRoles === 'object' && !Array.isArray(groupedRoles)
      ? { ...groupedRoles }
      : {};
  const s = String(selectedRole ?? '').trim();
  if (!s) return base;
  const flat = Object.values(base).flat();
  if (flat.includes(s)) return base;
  return { 'Assigned role': [s], ...base };
};

const filterGroupedRoles = (groupedRoles, query) => {
  const q = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!q) return groupedRoles;

  const out = {};
  Object.entries(groupedRoles).forEach(([teamType, roles]) => {
    const roleList = Array.isArray(roles) ? roles : [];
    const groupMatches = teamType.toLowerCase().includes(q);
    const matchedRoles = groupMatches
      ? roleList
      : roleList.filter((role) => role.toLowerCase().includes(q));

    if (groupMatches || matchedRoles.length > 0) {
      out[teamType] = matchedRoles;
    }
  });
  return out;
};

const SupportRolesSelect = ({
  value,
  onValueChange,
  hasError = false,
  disabled = false,
  id,
  onLoadingChange,
}) => {
  const [roleList, setRoleList] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef(null);
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  const stopSearchKeys = (event) => {
    event.stopPropagation();
    if (event.nativeEvent?.stopImmediatePropagation) {
      event.nativeEvent.stopImmediatePropagation();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      onLoadingChangeRef.current?.(true);
      setLoading(true);
      try {
        const response = await apiClient.get(
          '/method/devx.tracker.api.api_center_tracker_task.get_tracker_task_master_roles',
        );
        const raw = response?.data?.message ?? response?.data ?? {};
        const normalized = normalizeGetRolesMessage(raw);
        if (!cancelled) setRoleList(normalized);
      } catch {
        if (!cancelled) setRoleList({});
      } finally {
        if (!cancelled) {
          setLoading(false);
          onLoadingChangeRef.current?.(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      onLoadingChangeRef.current?.(false);
    };
  }, []);

  const displayList = useMemo(() => mergeOrphanSelectedRole(roleList, value), [roleList, value]);
  const filteredList = useMemo(
    () => filterGroupedRoles(displayList, searchQuery),
    [displayList, searchQuery],
  );
  const hasResults = Object.keys(filteredList).length > 0;

  const selectedRole = String(value ?? '').trim();

  useEffect(() => {
    if (!isOpen) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, searchQuery]);

  const options = useMemo(() => {
    const result = [];
    Object.entries(displayList).forEach(([groupName, roleNames]) => {
      if (Array.isArray(roleNames)) {
        roleNames.forEach((r) => {
          if (!result.some((o) => o.value === r)) {
            result.push({ value: r, label: r });
          }
        });
      }
    });
    return result;
  }, [displayList]);

  if (loading) {
    if (selectedRole) {
      return (
        <Select.Root value={selectedRole} disabled>
          <Select.Trigger className='w-full' id={id}>
            <Select.Value>{selectedRole}</Select.Value>
          </Select.Trigger>
        </Select.Root>
      );
    }
    return (
      <span className='paragraph-small text-text-soft-400 py-1.5 block'>Loading roles...</span>
    );
  }

  return (
    <SearchableSelect
      id={id}
      value={value}
      onValueChange={onValueChange}
      hasError={hasError}
      disabled={disabled}
      options={options}
      placeholder='Select role'
      showArrow={true}
    />
  );
};

export default SupportRolesSelect;
