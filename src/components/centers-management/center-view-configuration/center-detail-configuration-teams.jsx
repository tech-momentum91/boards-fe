import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Select from '@/components/ui/select';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useColumnConfig } from '@/hooks/use-column-config';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import {
  RiAddLine,
  RiSearchLine,
  RiLayoutColumnLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowUpSFill,
  RiArrowDownSFill,
  RiExpandUpDownFill,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { showSuccessToast, showErrorToast, extractErrorMessage } from '@/utils/error-utils';
import { getCenterTeamsConfig, saveCenterTeamsConfig } from '@/utils/center-configuration-storage';
import {
  fetchCenterTeamsConfigApi,
  saveCenterTeamsConfigApi,
  fetchCenterTeamsConfigRolesApi,
} from '@/api/centerConfiguration';
import { normalizeRoleEntry } from '@/utils/user-utils';

export const DEFAULT_ROLE_OPTIONS = [
  'Facility Manager',
  'Facility User',
  'CRM (Account Manager)',
  'MST',
  'Gardener',
  'HK Staff',
  'Valet',
  'Office Boy',
  'Pantry Boy',
  'Security Staff',
  'Supervisor',
];

const DEFAULT_TEAMS_COLUMNS = [
  { id: 'role', label: 'Role', visible: true, enableHiding: false },
  { id: 'memberMin', label: 'Member (MIN)', visible: true, enableHiding: true },
  { id: 'memberMax', label: 'Member (MAX)', visible: true, enableHiding: true },
];

const DEFAULT_TEAMS_FILTERS = Object.freeze({ role: [] });

const generateUniqueId = (prefix = 'row') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const normalizeTeamsRowsWithIds = (rawRows, existingRows = []) => {
  if (!Array.isArray(rawRows)) return [];
  const existingMap = new Map();
  (existingRows || []).forEach((r) => {
    if (r && r.id) {
      const key = (r.role || '').toLowerCase().trim();
      if (key) existingMap.set(key, r.id);
    }
  });

  return rawRows.map((row, idx) => {
    if (!row || typeof row !== 'object') return row;
    const roleKey = (row.role || '').toLowerCase().trim();
    const id =
      row.id ??
      row.name ??
      (roleKey ? existingMap.get(roleKey) : undefined) ??
      generateUniqueId(`team_${idx}`);
    return {
      ...row,
      id,
    };
  });
};

const CenterDetailConfigurationTeams = ({ centerId }) => {
  const [teamsRows, setTeamsRows] = useState(() =>
    normalizeTeamsRowsWithIds(getCenterTeamsConfig(centerId)),
  );
  const [groupedRoles, setGroupedRoles] = useState({});
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const requestIdRef = useRef(0);

  // Column Manager State & Hook
  const teamsTableId = `center-detail-teams-columns-${centerId || 'default'}`;
  const getTeamsColumnConfig = useCallback(() => {
    try {
      const saved = localStorage.getItem(`column-config-${teamsTableId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      void error;
      return [];
    }
  }, [teamsTableId]);

  const saveTeamsColumnConfig = useCallback(
    (cols) => {
      try {
        localStorage.setItem(`column-config-${teamsTableId}`, JSON.stringify(cols));
      } catch (error) {
        void error;
      }
    },
    [teamsTableId],
  );

  const teamsColumnConfig = useColumnConfig(
    teamsTableId,
    DEFAULT_TEAMS_COLUMNS,
    saveTeamsColumnConfig,
    getTeamsColumnConfig,
  );

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  // Filter State & Persistence Hook
  const teamsFilterStorageKey = `center-detail-teams-filters-${centerId || 'default'}`;
  const [persistedFilters, setFilters] = usePersistedFilters({
    storageKey: teamsFilterStorageKey,
    defaultFilters: DEFAULT_TEAMS_FILTERS,
    persistTrimStringArrays: true,
  });

  const selectedRoleFilters = useMemo(
    () => (Array.isArray(persistedFilters.role) ? persistedFilters.role : []),
    [persistedFilters.role],
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterActiveTab, setFilterActiveTab] = useState('role');
  const [filterSearch, setFilterSearch] = useState('');

  // Load team configuration dynamically from backend API
  const loadTeamsConfig = useCallback(async () => {
    if (!centerId) {
      setIsLoading(false);
      return;
    }
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const data = await fetchCenterTeamsConfigApi(centerId);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizeTeamsRowsWithIds(data);
      setTeamsRows(rows);
      saveCenterTeamsConfig(centerId, rows);
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to load Teams configuration');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [centerId]);

  useEffect(() => {
    loadTeamsConfig();
  }, [loadTeamsConfig]);

  // Fetch allowed roles grouped by category from backend API
  const fetchGroupedRoles = useCallback(async () => {
    setIsRolesLoading(true);
    try {
      const data = await fetchCenterTeamsConfigRolesApi();
      if (data && Object.keys(data).length > 0) {
        setGroupedRoles(data);
      }
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to fetch Teams configuration roles');
      showErrorToast(message);
    } finally {
      setIsRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroupedRoles();
  }, [fetchGroupedRoles]);

  // Search & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null); // 'memberMin' | 'memberMax'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Inline Form state for new team configuration
  const [newRole, setNewRole] = useState('');
  const [newMemberMin, setNewMemberMin] = useState('');
  const [newMemberMax, setNewMemberMax] = useState('');

  // Editing state
  const [editingRowId, setEditingRowId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Add team member configuration handler with auto-save
  const handleAddTeamRow = async (roleOverride) => {
    if (isSaving || isLoading) return;
    const roleToUse = roleOverride || newRole;
    if (!roleToUse) {
      showErrorToast('Please select a Role');
      return;
    }
    const minVal = newMemberMin !== '' ? Number(newMemberMin) : 0;
    const maxVal = newMemberMax !== '' ? Number(newMemberMax) : 0;

    if (maxVal < minVal) {
      showErrorToast('Maximum members cannot be less than minimum members');
      return;
    }

    // Check if role is already configured for this center
    const existing = teamsRows.find(
      (r) => (r.role || '').toLowerCase().trim() === roleToUse.toLowerCase().trim(),
    );
    if (existing) {
      showErrorToast(`Configuration for role "${roleToUse}" already exists`);
      return;
    }

    const newRow = {
      id: generateUniqueId('team_new'),
      role: roleToUse,
      memberMin: minVal,
      memberMax: maxVal,
    };

    const targetRows = [...teamsRows, newRow];
    const currentReqId = ++requestIdRef.current;
    setIsSaving(true);
    try {
      const savedData = await saveCenterTeamsConfigApi(centerId, targetRows);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizeTeamsRowsWithIds(savedData, targetRows);
      setTeamsRows(rows);
      saveCenterTeamsConfig(centerId, rows);
      showSuccessToast('Team configuration added successfully');
      setNewRole('');
      setNewMemberMin('');
      setNewMemberMax('');
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to add Team configuration');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  // Start editing
  const handleStartEdit = (row) => {
    if (isSaving || isLoading) return;
    setEditingRowId(row.id);
    setEditForm({ ...row });
  };

  // Cancel edit
  const handleCancelEdit = () => {
    if (isSaving) return;
    setEditingRowId(null);
    setEditForm(null);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (isSaving || isLoading || !editForm) return;
    const minVal = editForm.memberMin !== '' ? Number(editForm.memberMin) : 0;
    const maxVal = editForm.memberMax !== '' ? Number(editForm.memberMax) : 0;

    if (maxVal < minVal) {
      showErrorToast('Maximum members cannot be less than minimum members');
      return;
    }

    // Check if changed role duplicates another configured role
    const existing = teamsRows.find(
      (r) =>
        r.id !== editForm.id &&
        (r.role || '').toLowerCase().trim() === (editForm.role || '').toLowerCase().trim(),
    );
    if (existing) {
      showErrorToast(`Configuration for role "${editForm.role}" already exists`);
      return;
    }

    const targetRows = teamsRows.map((row) =>
      row.id === editForm.id ? { ...editForm, memberMin: minVal, memberMax: maxVal } : row,
    );
    const currentReqId = ++requestIdRef.current;
    setIsSaving(true);
    try {
      const savedData = await saveCenterTeamsConfigApi(centerId, targetRows);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizeTeamsRowsWithIds(savedData, targetRows);
      setTeamsRows(rows);
      saveCenterTeamsConfig(centerId, rows);
      showSuccessToast('Team configuration updated');
      setEditingRowId(null);
      setEditForm(null);
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to update Team configuration');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  // Delete row
  const handleDeleteRow = async (id) => {
    if (isSaving || isLoading) return;
    const targetRows = teamsRows.filter((r) => r.id !== id);
    const currentReqId = ++requestIdRef.current;
    setIsSaving(true);
    try {
      const savedData = await saveCenterTeamsConfigApi(centerId, targetRows);
      if (currentReqId !== requestIdRef.current) return;
      const rows = normalizeTeamsRowsWithIds(savedData, targetRows);
      setTeamsRows(rows);
      saveCenterTeamsConfig(centerId, rows);
      showSuccessToast('Team configuration removed');
    } catch (error) {
      if (currentReqId !== requestIdRef.current) return;
      const message = extractErrorMessage(error, 'Failed to remove Team configuration');
      showErrorToast(message);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Column visibility map helper
  const columnVisibilityMap = useMemo(() => {
    return teamsColumnConfig.columns.reduce((acc, col) => {
      acc[col.id] = col.visible !== false;
      return acc;
    }, {});
  }, [teamsColumnConfig.columns]);

  // Filter options list for Role
  const availableFilterRoles = useMemo(() => {
    const set = new Set(DEFAULT_ROLE_OPTIONS);
    if (groupedRoles && Object.keys(groupedRoles).length > 0) {
      Object.values(groupedRoles).forEach((roleGroup) => {
        const items = Array.isArray(roleGroup) ? roleGroup : [];
        items.forEach((item) => {
          const norm = normalizeRoleEntry(item);
          if (norm.name) set.add(norm.name);
        });
      });
    }
    teamsRows.forEach((r) => {
      if (r.role) set.add(r.role);
    });
    return [...set];
  }, [groupedRoles, teamsRows]);

  const currentFilterOptions = useMemo(() => {
    if (!filterSearch.trim()) return availableFilterRoles;
    const q = filterSearch.toLowerCase();
    return availableFilterRoles.filter((opt) => opt.toLowerCase().includes(q));
  }, [availableFilterRoles, filterSearch]);

  const filterCount = selectedRoleFilters.length;

  const handleClearFilters = (e) => {
    e?.stopPropagation?.();
    setFilters(DEFAULT_TEAMS_FILTERS);
    setFilterSearch('');
  };

  const handleToggleFilterOption = (val) => {
    const updated = selectedRoleFilters.includes(val)
      ? selectedRoleFilters.filter((item) => item !== val)
      : [...selectedRoleFilters, val];
    setFilters((prev) => ({ ...prev, role: updated }));
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let list = [...teamsRows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((r) => (r.role || '').toLowerCase().includes(term));
    }

    if (selectedRoleFilters.length > 0) {
      list = list.filter((r) => selectedRoleFilters.includes(r.role));
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = Number(a[sortField]) || 0;
        const valB = Number(b[sortField]) || 0;
        if (sortDirection === 'asc') {
          return valA - valB;
        }
        return valB - valA;
      });
    }

    return list;
  }, [teamsRows, searchTerm, selectedRoleFilters, sortField, sortDirection]);

  // Sort icon renderer
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <RiExpandUpDownFill className='size-4 text-text-sub-500 hover:text-text-strong-950 transition-colors' />
      );
    }
    if (sortDirection === 'asc') {
      return <RiArrowUpSFill className='size-4 text-text-strong-950' />;
    }
    return <RiArrowDownSFill className='size-4 text-text-strong-950' />;
  };

  // Configured roles set for new creation (excludes all currently configured roles in teamsRows)
  const configuredRoleSet = useMemo(() => {
    return new Set(teamsRows.map((r) => (r.role || '').toLowerCase().trim()).filter(Boolean));
  }, [teamsRows]);

  // Configured roles set for editing (excludes roles configured in OTHER rows)
  const getEditingExcludedRoleSet = useCallback(
    (rowId) => {
      return new Set(
        teamsRows
          .filter((r) => r.id !== rowId)
          .map((r) => (r.role || '').toLowerCase().trim())
          .filter(Boolean),
      );
    },
    [teamsRows],
  );

  // Render role options grouped by team type with role exclusion
  const renderRoleSelectItems = useCallback(
    (excludedRoles = new Set()) => {
      if (!groupedRoles || Object.keys(groupedRoles).length === 0) {
        return DEFAULT_ROLE_OPTIONS.filter((r) => !excludedRoles.has(r.toLowerCase().trim())).map(
          (r) => (
            <Select.Item key={r} value={r}>
              {r}
            </Select.Item>
          ),
        );
      }

      return Object.entries(groupedRoles).map(([team_type, role_name], index) => {
        const rolesRaw = Array.isArray(role_name)
          ? role_name
          : role_name && typeof role_name === 'object'
            ? Object.values(role_name).flatMap((v) => (Array.isArray(v) ? v : []))
            : [];
        const roles = rolesRaw
          .map((item) => normalizeRoleEntry(item))
          .filter((e) => e.name && !excludedRoles.has(e.name.toLowerCase().trim()));

        if (roles.length === 0) return null;

        return (
          <div key={team_type || String(index)} className='flex flex-col py-1'>
            <span className='px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-soft-400 select-none block'>
              {team_type}
            </span>
            {roles.map((entry, roleIdx) => (
              <Select.Item
                key={`${team_type}-${entry.name}-${roleIdx}`}
                value={entry.name}
                className='paragraph-small'
              >
                {entry.name}
              </Select.Item>
            ))}
          </div>
        );
      });
    },
    [groupedRoles],
  );

  const isBusy = isLoading || isSaving || isRolesLoading;

  return (
    <div className='w-full h-full flex flex-col gap-4 overflow-hidden'>
      {/* Top Toolbar */}
      <div className='w-full flex items-center justify-between gap-3 shrink-0'>
        <div className='w-[280px] min-w-[200px]'>
          <Input.Root size='xsmall'>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine />
              </Input.Icon>
              <Input.Input
                placeholder='Search by role'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isBusy}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex items-center gap-2'>
          {/* Filter Popover */}
          <Popover.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleClearFilters}
              tooltipContent='Filter'
              ariaLabel='Filter team configuration'
              size='xsmall'
              disabled={isBusy}
            />
            <Filter.Root>
              <Filter.Header title='FILTERS' onClear={handleClearFilters} />
              <Filter.Body>
                <Filter.Sidebar width='160px'>
                  <TabMenuVertical.Root value={filterActiveTab} onValueChange={setFilterActiveTab}>
                    <TabMenuVertical.List className='p-2 border-r-0'>
                      <TabMenuVertical.Trigger
                        className='w-full flex items-center justify-between'
                        value='role'
                      >
                        <span>Role</span>
                        {selectedRoleFilters.length > 0 ? (
                          <Badge.Root
                            size='medium'
                            variant='filled'
                            className='shrink-0 rounded-full bg-black text-white'
                          >
                            {selectedRoleFilters.length}
                          </Badge.Root>
                        ) : (
                          <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                        )}
                      </TabMenuVertical.Trigger>
                    </TabMenuVertical.List>
                  </TabMenuVertical.Root>
                </Filter.Sidebar>

                <Filter.Content width='260px'>
                  <Filter.List
                    options={currentFilterOptions}
                    selectedValues={selectedRoleFilters}
                    onToggle={handleToggleFilterOption}
                    searchValue={filterSearch}
                    onSearchChange={setFilterSearch}
                    searchPlaceholder='Search options...'
                    emptyMessage='No options found'
                  />
                </Filter.Content>
              </Filter.Body>
            </Filter.Root>
          </Popover.Root>

          {/* Column Manager Dropdown */}
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={teamsColumnConfig}
            tooltipContent='Column Manager'
            footer={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='w-full justify-center'
                onClick={teamsColumnConfig.resetToDefault}
                disabled={isBusy}
              >
                Reset Columns
              </Button.Root>
            }
            trigger={
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                aria-label='Columns'
                disabled={isBusy}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        </div>
      </div>

      {/* Teams Table Container */}
      <div className='flex-1 w-full min-h-0 overflow-y-auto border border-stroke-soft-200 rounded-xl bg-bg-white-0'>
        <Table.Root>
          <Table.Header>
            <Table.Row className='border-b border-stroke-soft-200 bg-bg-weak-50'>
              {columnVisibilityMap.role && (
                <Table.Head className='w-[350px] font-medium text-text-sub-500 py-3.5 px-4'>
                  Role
                </Table.Head>
              )}
              {columnVisibilityMap.memberMin && (
                <Table.Head className='w-[200px] font-medium text-text-sub-500 py-3.5 px-4'>
                  <button
                    type='button'
                    onClick={() => handleSort('memberMin')}
                    disabled={isBusy}
                    className='flex items-center gap-1.5 hover:text-text-strong-950 transition-colors disabled:opacity-50'
                  >
                    <span>Member (MIN)</span>
                    {renderSortIcon('memberMin')}
                  </button>
                </Table.Head>
              )}
              {columnVisibilityMap.memberMax && (
                <Table.Head className='w-[200px] font-medium text-text-sub-500 py-3.5 px-4'>
                  <button
                    type='button'
                    onClick={() => handleSort('memberMax')}
                    disabled={isBusy}
                    className='flex items-center gap-1.5 hover:text-text-strong-950 transition-colors disabled:opacity-50'
                  >
                    <span>Member (MAX)</span>
                    {renderSortIcon('memberMax')}
                  </button>
                </Table.Head>
              )}
              <Table.Head className='w-[80px] text-right py-3.5 px-4' />
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {/* Existing Rows */}
            {filteredAndSortedRows.map((row) => {
              const isEditing = editingRowId === row.id;

              if (isEditing && editForm) {
                return (
                  <Table.Row
                    key={row.id}
                    className='border-b border-stroke-soft-200 bg-bg-weak-50/50'
                  >
                    {columnVisibilityMap.role && (
                      <Table.Cell className='py-3 px-4'>
                        <Select.Root
                          size='xsmall'
                          value={editForm.role}
                          onValueChange={(val) => setEditForm((prev) => ({ ...prev, role: val }))}
                          disabled={isBusy}
                        >
                          <Select.Trigger className='w-full'>
                            <Select.Value placeholder='Select role' />
                          </Select.Trigger>
                          <Select.Content className='min-w-[var(--radix-select-trigger-width)] max-h-[300px] overflow-y-auto'>
                            {renderRoleSelectItems(getEditingExcludedRoleSet(row.id))}
                          </Select.Content>
                        </Select.Root>
                      </Table.Cell>
                    )}

                    {columnVisibilityMap.memberMin && (
                      <Table.Cell className='py-3 px-4'>
                        <Input.Root size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              value={editForm.memberMin}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  memberMin: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              disabled={isBusy}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </Table.Cell>
                    )}

                    {columnVisibilityMap.memberMax && (
                      <Table.Cell className='py-3 px-4'>
                        <Input.Root size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              type='number'
                              value={editForm.memberMax}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  memberMax: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              disabled={isBusy}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </Table.Cell>
                    )}

                    <Table.Cell className='py-3 px-4 text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button.Root
                          size='xsmall'
                          variant='primary'
                          onClick={handleSaveEdit}
                          aria-label='Save'
                          disabled={isBusy}
                        >
                          <Button.Icon as={RiCheckLine} />
                        </Button.Root>
                        <Button.Root
                          size='xsmall'
                          variant='neutral'
                          mode='stroke'
                          onClick={handleCancelEdit}
                          aria-label='Cancel'
                          disabled={isBusy}
                        >
                          <Button.Icon as={RiCloseLine} />
                        </Button.Root>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              }

              return (
                <Table.Row
                  key={row.id}
                  className='border-b border-stroke-soft-200 hover:bg-bg-weak-50 transition-colors group cursor-pointer'
                  onClick={(e) => {
                    if (!e.target.closest('button') && !isBusy) {
                      handleStartEdit(row);
                    }
                  }}
                >
                  {columnVisibilityMap.role && (
                    <Table.Cell className='py-3.5 px-4 font-normal text-text-strong-950'>
                      {row.role}
                    </Table.Cell>
                  )}
                  {columnVisibilityMap.memberMin && (
                    <Table.Cell className='py-3.5 px-4 text-text-strong-950 font-normal'>
                      {row.memberMin}
                    </Table.Cell>
                  )}
                  {columnVisibilityMap.memberMax && (
                    <Table.Cell className='py-3.5 px-4 text-text-strong-950 font-normal'>
                      {row.memberMax}
                    </Table.Cell>
                  )}
                  <Table.Cell className='py-3.5 px-4 text-right'>
                    <div className='flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(row);
                        }}
                        disabled={isBusy}
                        className='p-1 text-text-sub-500 hover:text-text-strong-950 rounded transition-colors disabled:opacity-50'
                        aria-label='Edit configuration'
                      >
                        <RiPencilLine size={16} />
                      </button>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(row.id);
                        }}
                        disabled={isBusy}
                        className='p-1 text-text-sub-500 hover:text-error-base rounded transition-colors disabled:opacity-50'
                        aria-label='Delete configuration'
                      >
                        <RiDeleteBinLine size={16} />
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}

            {/* Inline Add Row */}
            <Table.Row className='border-b border-stroke-soft-200 bg-bg-white-0'>
              {columnVisibilityMap.role && (
                <Table.Cell className='py-3 px-4'>
                  <Select.Root
                    size='xsmall'
                    value={newRole}
                    onValueChange={setNewRole}
                    disabled={isBusy}
                  >
                    <Select.Trigger className='w-full text-text-soft-400'>
                      <Select.Value placeholder='Select' />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)] max-h-[300px] overflow-y-auto'>
                      {renderRoleSelectItems(configuredRoleSet)}
                    </Select.Content>
                  </Select.Root>
                </Table.Cell>
              )}

              {columnVisibilityMap.memberMin && (
                <Table.Cell className='py-3 px-4'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        placeholder='Enter minimum members required.'
                        value={newMemberMin}
                        onChange={(e) => setNewMemberMin(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTeamRow();
                        }}
                        disabled={isBusy}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </Table.Cell>
              )}

              {columnVisibilityMap.memberMax && (
                <Table.Cell className='py-3 px-4'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        placeholder='Enter maximum members required.'
                        value={newMemberMax}
                        onChange={(e) => setNewMemberMax(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTeamRow();
                        }}
                        disabled={isBusy}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </Table.Cell>
              )}

              <Table.Cell className='py-3 px-4 text-right' />
            </Table.Row>

            {/* Bottom Add Team Member Action */}
            <Table.Row>
              <Table.Cell
                colSpan={teamsColumnConfig.columns.filter((c) => c.visible !== false).length + 1}
                className='py-3 px-4'
              >
                <button
                  type='button'
                  onClick={() => handleAddTeamRow()}
                  disabled={isBusy}
                  className='inline-flex items-center gap-1.5 text-paragraph-sm font-medium text-text-sub-500 hover:text-text-strong-950 transition-colors disabled:opacity-50'
                >
                  <RiAddLine size={18} />
                  <span>{isSaving ? 'Saving...' : 'Add Team Member'}</span>
                </button>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
};

export default CenterDetailConfigurationTeams;
