import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiEyeLine, RiSettings2Line, RiCheckLine } from 'react-icons/ri';
import CardLayout from '@/components/card-layout';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import {
  MODULES,
  PERM,
  ROLE_MODULE_PERMISSIONS,
  USER_TYPES,
} from '@/components/users-management/constants';

const RolePermissionModal = ({ isOpen, roleData, handleOpenChange }) => {
  // Get the role name from the clicked row
  const roleName = roleData?.name || '';
  if (!roleData) return null;

  const rolePermissions = ROLE_MODULE_PERMISSIONS[roleName] || {};
  const modulesToDisplay = MODULES.map((mod) => {
    const id = typeof mod === 'string' ? mod : mod.id;
    const label = typeof mod === 'string' ? mod : mod.label;
    return {
      moduleId: id,
      moduleLabel: label,
      permissions: rolePermissions[id] || PERM.NONE,
    };
  });

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[800px] max-h-[500px] overflow-y-auto'>
        <Modal.Header
          icon={RiSettings2Line}
          className='sticky top-0 z-10 bg-bg-white-0'
          title={roleData?.name || 'Role'}
          description={roleData?.description || 'No description available'}
        />
        <Modal.Body>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Modules</Table.Head>
                <Table.Head>View</Table.Head>
                <Table.Head>Create</Table.Head>
                <Table.Head>Edit</Table.Head>
                <Table.Head>Delete</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {modulesToDisplay.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5} className='text-center text-text-sub-600'>
                    No permissions found
                  </Table.Cell>
                </Table.Row>
              ) : (
                modulesToDisplay.map((module, i) => {
                  const modulePermissions = module.permissions || PERM.NONE;
                  const hasView = Boolean(modulePermissions.view);
                  const hasCreate = Boolean(modulePermissions.create);
                  const hasEdit = Boolean(modulePermissions.edit);
                  const hasDelete = Boolean(modulePermissions.delete);
                  const { note } = modulePermissions;

                  return (
                    <React.Fragment key={module.moduleId}>
                      <Table.Row>
                        <Table.Cell>
                          <span className='text-text-strong-950'>{module.moduleLabel}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className='flex items-center gap-2'>
                            {hasView ? <RiCheckLine className='size-5 text-text-sub-600' /> : '-'}
                            {/* {note ? <span className='text-xs text-text-sub-600'>{note}</span> : null} */}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          {hasCreate ? <RiCheckLine className='size-5 text-text-sub-600' /> : '-'}
                        </Table.Cell>
                        <Table.Cell>
                          {hasEdit ? <RiCheckLine className='size-5 text-text-sub-600' /> : '-'}
                        </Table.Cell>
                        <Table.Cell>
                          {hasDelete ? <RiCheckLine className='size-5 text-text-sub-600' /> : '-'}
                        </Table.Cell>
                      </Table.Row>
                      {i < modulesToDisplay.length - 1 && <Table.RowDivider />}
                    </React.Fragment>
                  );
                })
              )}
            </Table.Body>
          </Table.Root>
        </Modal.Body>
        <Modal.Footer className='sticky bottom-0 z-10 bg-bg-white-0'>
          <div className='w-full flex items-center justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

import { getSortingIcon } from '@/components/ui/table';

const ActionCell = ({ row, onView }) => {
  return (
    <div className='text-right'>
      <Button.Root
        variant='neutral'
        mode='ghost'
        size='xsmall'
        onClick={() => onView?.(row.original)}
      >
        <Button.Icon as={RiEyeLine} />
      </Button.Root>
    </div>
  );
};

const columns = (onView) => [
  {
    id: 'roleName',
    accessorKey: 'name',
    header: ({ column }) => (
      <div className='flex items-center gap-1'>
        Role Name
        <button
          type='button'
          className='cursor-pointer text-text-sub-600'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {getSortingIcon(column.getIsSorted())}
        </button>
      </div>
    ),
    cell: ({ row }) => (
      <span className='text-text-strong-950 whitespace-nowrap'>{row.original?.name || ''}</span>
    ),
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: () => <span>Description</span>,
    cell: ({ row }) => (
      <span className='text-text-sub-600'>
        {row.original?.description || 'No description available'}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => <ActionCell row={row} onView={onView} />,
    meta: {
      headClassName: 'sticky right-0 z-20 bg-bg-weak-50',
      cellClassName: 'sticky right-0 z-20 bg-white text-right',
    },
  },
];

const RolesPermissionProfile = ({ currentRole }) => {
  const [sorting, setSorting] = React.useState([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [roleData, setRoleData] = React.useState(null);

  const rolesData =
    currentRole === 'Admin' ? USER_TYPES.filter((role) => role.name !== 'Super Admin') : USER_TYPES;
  const isLoading = false;

  const handleViewRole = (role) => {
    setRoleData(role);
    setIsOpen(true);
  };

  const table = useReactTable({
    data: rolesData,
    columns: columns(handleViewRole),
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  const handleOpenChange = (open) => {
    if (!open) {
      setIsOpen(false);
      setRoleData(null);
    }
  };

  return (
    <div className='w-full flex flex-col gap-10 items-center justify-center'>
      <CardLayout
        cardTitle='Roles & Permissions'
        cardDescription='View available user types and their module permissions.'
      />
      {isLoading ? (
        <div className='w-full'>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>
                  <div className='h-4 w-24 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                </Table.Head>
                <Table.Head>
                  <div className='h-4 w-32 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                </Table.Head>
                <Table.Head>
                  <div className='h-4 w-16 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Array.from({ length: 6 }).map((_, index, array) => (
                <React.Fragment key={`skeleton-${index}`}>
                  <Table.Row>
                    <Table.Cell>
                      <div className='h-4 w-32 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                    </Table.Cell>
                    <Table.Cell>
                      <div className='h-4 w-24 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                    </Table.Cell>
                    <Table.Cell>
                      <div className='h-4 w-16 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                    </Table.Cell>
                  </Table.Row>
                  {index < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
      ) : (
        <Table.Root>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    className={header.column.columnDef.meta?.headClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          <Table.Body>
            {table.getRowModel().rows.map((row, i, rows) => (
              <React.Fragment key={row.id}>
                <Table.Row>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
                {i < rows.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      )}
      <RolePermissionModal
        isOpen={isOpen}
        roleData={roleData}
        handleOpenChange={handleOpenChange}
      />
    </div>
  );
};

export default RolesPermissionProfile;
