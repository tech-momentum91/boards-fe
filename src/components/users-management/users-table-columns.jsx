import React from 'react';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { getInitials } from '@/lib/utils';
import { ActionCell } from './users-table-actions';
import { getSortingIcon } from '@/components/ui/table';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { ALL_CENTERS_LABEL, isTruthyAllCentersFlag } from '@/utils/user-utils';

export { getSortingIcon };

// Define all available columns with IDs for column management
// Map API column IDs to column definitions

const getBadgeColor = (role) => {
  if (role === 'Admin') return 'blue';
  if (role === 'Facility Manager') return 'orange';
  if (role == 'Super Admin') return 'black';
  if (role == 'Client Admin') return 'green';
  if (role == 'Client User') return 'green';

  return 'gray';
};

export const createColumnDefs = (apiColumns = []) => {
  // Create a map of API column IDs to their config
  const apiColumnMap = new Map();
  apiColumns.forEach((col) => {
    apiColumnMap.set(col.id, col);
  });

  // Base column definitions
  const baseColumnDefs = [
    {
      id: 'name',
      // Prefer `name` from API rows, fallback to `full_name`
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          // Align the header text above the name text (not the avatar) by offsetting
          // equal to avatar width (40px) + gap (12px) = 52px
          <div className='flex items-center gap-0.5 '>
            Name
            <button
              className='cursor-pointer '
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {getSortingIcon(column.getIsSorted())}
            </button>
          </div>
        );
      },
      cell: ({ row }) => {
        const displayName = row.original.name || row.original.full_name || '';
        const userImage = row.original.user_image;
        const initials = getInitials(displayName) || '--';

        return (
          <div className='grid grid-cols-[40px_1fr] items-center gap-3'>
            <Avatar.Root size='40'>
              {userImage ? (
                <Avatar.Image src={userImage} alt={displayName} />
              ) : (
                <span className='text-text-sub-500'>{initials}</span>
              )}
            </Avatar.Root>
            <span className='whitespace-nowrap paragraph-small'>{displayName || '--'}</span>
          </div>
        );
      },
    },

    {
      id: 'email',
      accessorKey: 'email',
      header: () => {
        const apiCol = apiColumnMap.get('email');
        const label = apiCol?.label || 'Email';
        return <div className='flex label-small items-center gap-0.5'>{label}</div>;
      },
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600'>{row.original.email}</span>
      ),
    },

    {
      id: 'user_role',
      accessorKey: 'user_role',
      header: () => {
        const apiCol = apiColumnMap.get('user_role');
        const label = apiCol?.label || 'Role';
        return <div className='flex label-small items-center gap-0.5'>{label}</div>;
      },
      cell: ({ row }) => {
        const roles =
          Array.isArray(row.original.roles) && row.original.roles.length > 0
            ? row.original.roles
            : row.original.user_role
              ? [String(row.original.user_role)]
              : [];
        if (roles.length === 0) {
          return <span className='paragraph-small text-nowrap'>--</span>;
        }

        const firstRole = roles[0];
        const additionalRoles = roles.slice(1);
        const additionalCount = additionalRoles.length;

        return (
          <div className='flex whitespace-nowrap items-center gap-2'>
            <Badge.Root size='medium' variant='light' color={getBadgeColor(firstRole)}>
              {firstRole}
            </Badge.Root>
            {additionalCount > 0 && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Badge.Root variant='lighter' color='gray' size='medium'>
                    <span className='text-label-xs font-semibold text-text-strong-950'>
                      +{additionalCount}
                    </span>
                  </Badge.Root>
                </Tooltip.Trigger>
                <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                  <div className='flex flex-col gap-1'>
                    <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                      Additional roles ({additionalCount})
                    </span>
                    <div className='flex flex-col gap-1'>
                      {additionalRoles.map((role, index) => (
                        <div key={index} className='text-paragraph-sm text-text-sub-600'>
                          {role}
                        </div>
                      ))}
                    </div>
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            )}
          </div>
        );
      },
    },

    {
      id: 'enabled',
      accessorKey: 'enabled',
      header: () => {
        return <div className='flex label-small items-center gap-0.5'>Status</div>;
      },
      cell: ({ row }) => (
        <span className='paragraph-small'>
          <Badge.Root
            size='medium'
            variant='light'
            color={row.original.enabled == 1 ? 'green' : 'red'}
          >
            {row.original.enabled == 1 ? 'ACTIVE' : 'INACTIVE'}
          </Badge.Root>
        </span>
      ),
    },
    {
      id: 'center',
      accessorKey: 'center',
      header: () => {
        const apiCol = apiColumnMap.get('center');
        const label = apiCol?.label || 'Center';
        return <div className='flex label-small items-center gap-0.5'>{label}</div>;
      },
      cell: ({ row }) => {
        if (isTruthyAllCentersFlag(row.original.all_centers)) {
          return (
            <div className='flex whitespace-nowrap items-center gap-2'>
              <Badge.Root variant='lighter' color='gray' size='medium'>
                <span className='paragraph-small font-medium text-text-strong-950'>
                  {ALL_CENTERS_LABEL}
                </span>
              </Badge.Root>
            </div>
          );
        }

        let centerNames = [];
        if (
          Array.isArray(row.original.center_names_list) &&
          row.original.center_names_list.length > 0
        ) {
          centerNames = row.original.center_names_list.filter(Boolean);
        } else if (
          Array.isArray(row.original.centers) &&
          row.original.centers.length > 0 &&
          row.original.centers[0] &&
          typeof row.original.centers[0] === 'object'
        ) {
          centerNames = row.original.centers
            .map((c) => {
              if (!c || typeof c !== 'object') return '';
              return String(c.center_name ?? '').trim();
            })
            .filter(Boolean);
        } else {
          const centerValue = row.original.center_name ?? row.original.center;
          if (!centerValue || (Array.isArray(centerValue) && centerValue.length === 0)) {
            return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>--</span>;
          }
          if (Array.isArray(centerValue)) {
            centerNames = centerValue.filter(Boolean);
          } else if (typeof centerValue === 'string') {
            centerNames = centerValue
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean);
          }
        }

        if (centerNames.length === 0) {
          return <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>--</span>;
        }

        const firstCenter = centerNames[0];
        const additionalCenters = centerNames.slice(1);
        const additionalCount = additionalCenters.length;

        const centerMatch = firstCenter.match(/^(.+?)\s*\(([^)]+)\)$/);
        const centerName = centerMatch ? centerMatch[1].trim() : firstCenter;
        const centerCode = centerMatch ? centerMatch[2] : null;

        return (
          <div className='flex whitespace-nowrap items-center gap-2'>
            <Badge.Root variant='lighter' color='gray' size='medium'>
              <span className='paragraph-small font-medium text-text-strong-950'>{centerName}</span>
              {centerCode && (
                <span className='paragraph-small text-text-sub-400 ml-1'>({centerCode})</span>
              )}
            </Badge.Root>
            {additionalCount > 0 && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Badge.Root variant='lighter' color='gray' size='medium'>
                    <span className='text-label-xs font-semibold text-text-strong-950'>
                      +{additionalCount}
                    </span>
                  </Badge.Root>
                </Tooltip.Trigger>
                <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                  <div className='flex flex-col gap-1'>
                    <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                      Additional centers ({additionalCount})
                    </span>
                    <div className='flex flex-col gap-1'>
                      {additionalCenters.map((center, index) => {
                        const match = center.match(/^(.+?)\s*\(([^)]+)\)$/);
                        const name = match ? match[1].trim() : center;
                        const code = match ? match[2] : null;
                        return (
                          <div key={index} className='text-paragraph-sm text-text-sub-600'>
                            {name}
                            {code && <span className='text-text-sub-400 ml-1'>({code})</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            )}
          </div>
        );
      },
    },

    {
      id: 'last_login',
      accessorKey: 'last_login',
      header: () => {
        const apiCol = apiColumnMap.get('last_login');
        const label = apiCol?.label || 'Last Login';
        return <div className='flex label-small items-center gap-0.5'>{label}</div>;
      },
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600'>
          {safeDisplayDateTime(row.original.last_login) || '--'}
        </span>
      ),
    },

    // Always include actions column
    {
      id: 'actions',
      enableHiding: false,
      header: () => null, // Empty header for actions column
      cell: ({ row }) => (
        <div className='flex items-center justify-end'>
          <ActionCell row={row} />
        </div>
      ),
      meta: {
        headClassName: 'sticky right-0 z-20 bg-bg-weak-50 min-w-[60px]',
        cellClassName: 'sticky right-0 z-20 bg-white min-w-[60px]',
      },
    },
  ];

  // Include ALL base columns, use API response for ordering and labels
  // This ensures all columns are available even if not in API response
  if (apiColumns.length > 0) {
    const orderedColumns = [];
    const columnDefinitionMap = new Map(baseColumnDefs.map((col) => [col.id, col]));
    const processedIds = new Set();

    // Get actions column first (to exclude it from API columns)
    const actionsCol = baseColumnDefs.find((col) => col.id === 'actions');

    // First, add columns in API order (include ALL columns from API, regardless of visibility)
    apiColumns.forEach((apiCol) => {
      // Skip actions column from API - we'll add it at the end
      if (apiCol.id === 'actions') {
        return;
      }

      const columnDefinition = columnDefinitionMap.get(apiCol.id);
      if (columnDefinition) {
        // Include ALL columns from API regardless of visibility
        // Update header with API label
        orderedColumns.push({
          ...columnDefinition,
          header:
            typeof columnDefinition.header === 'function'
              ? (props) => {
                  const HeaderComponent = columnDefinition.header;
                  return <HeaderComponent {...props} />;
                }
              : () => <div className='flex label-small items-center gap-0.5'>{apiCol.label}</div>,
        });
        processedIds.add(apiCol.id);
      }
    });

    // Then, add any remaining base columns that weren't in API response
    baseColumnDefs.forEach((baseCol) => {
      if (baseCol.id !== 'actions' && !processedIds.has(baseCol.id)) {
        orderedColumns.push(baseCol);
      }
    });

    // Always add actions column at the end
    if (actionsCol) {
      orderedColumns.push(actionsCol);
    }

    return orderedColumns;
  }

  // Return base columns if no API columns, ensuring actions is last
  const baseColumnsWithoutActions = baseColumnDefs.filter((col) => col.id !== 'actions');
  const actionsCol = baseColumnDefs.find((col) => col.id === 'actions');
  if (actionsCol) {
    baseColumnsWithoutActions.push(actionsCol);
  }
  return baseColumnsWithoutActions;
};
