import React, { useMemo } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';
import * as Select from '@/components/ui/select';
import { cn } from '@/lib/utils';
import * as Badge from '@/components/ui/badge';

// Status color mapping based on Figma design
const STATUS_COLORS = {
  open: 'blue', // blue
  'in progress': 'orange', // orange
  'on hold': 'purple', // purple
  resolved: 'green', // green
  closed: 'gray', // gray
  escalated: 'red', // red
};

export const SVG_MAP = {
  Open: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#375DFB'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C8.15026 2.7002 9.07617 3.00104 9.84498 3.55962C10.6138 4.1182 11.186 4.90582 11.4797 5.80962L7.19995 7.2002V2.7002Z'
        fill='#375DFB'
      />
    </svg>
  ),
  'In Progress': (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#F27B2C'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C8.15026 2.7002 9.07617 3.00104 9.84498 3.55962C10.6138 4.1182 11.186 4.90582 11.4797 5.80962C11.7734 6.71341 11.7734 7.68698 11.4797 8.59077C11.186 9.49457 10.6138 10.2822 9.84498 10.8408L7.19995 7.2002V2.7002Z'
        fill='#F27B2C'
      />
    </svg>
  ),
  'On Hold': (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#6E3FF3'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C7.9101 2.7002 8.61016 2.86827 9.24291 3.19067C9.87565 3.51307 10.4231 3.98064 10.8405 4.55516C11.2579 5.12968 11.5335 5.79484 11.6445 6.49624C11.7556 7.19764 11.6992 7.91538 11.4797 8.59077C11.2603 9.26616 10.8841 9.88003 10.3819 10.3822C9.87978 10.8843 9.26592 11.2605 8.59053 11.4799C7.91514 11.6994 7.1974 11.7559 6.496 11.6448C5.79459 11.5337 5.12944 11.2582 4.55492 10.8408L7.19995 7.2002V2.7002Z'
        fill='#6E3FF3'
      />
    </svg>
  ),
  Resolved: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#079455'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C8.15026 2.7002 9.07617 3.00104 9.84498 3.55962C10.6138 4.1182 11.186 4.90582 11.4797 5.80962C11.7734 6.71341 11.7734 7.68698 11.4797 8.59077C11.186 9.49457 10.6138 10.2822 9.84498 10.8408C9.07617 11.3993 8.15026 11.7002 7.19995 11.7002C6.24964 11.7002 5.32373 11.3993 4.55492 10.8408C3.7861 10.2822 3.21386 9.49457 2.9202 8.59077C2.62654 7.68698 2.62654 6.71341 2.9202 5.80962L7.19995 7.2002V2.7002Z'
        fill='#079455'
      />
    </svg>
  ),
  Closed: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#868C98'
        strokeWidth='1.35'
      />
      <circle cx='4.5' cy='4.5' r='4.5' transform='matrix(-1 0 0 1 11.7 2.7002)' fill='#868C98' />
    </svg>
  ),
  Active: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#079455'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C8.15026 2.7002 9.07617 3.00104 9.84498 3.55962C10.6138 4.1182 11.186 4.90582 11.4797 5.80962C11.7734 6.71341 11.7734 7.68698 11.4797 8.59077C11.186 9.49457 10.6138 10.2822 9.84498 10.8408C9.07617 11.3993 8.15026 11.7002 7.19995 11.7002C6.24964 11.7002 5.32373 11.3993 4.55492 10.8408C3.7861 10.2822 3.21386 9.49457 2.9202 8.59077C2.62654 7.68698 2.62654 6.71341 2.9202 5.80962L7.19995 7.2002V2.7002Z'
        fill='#079455'
      />
    </svg>
  ),
  Inactive: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#868C98'
        strokeWidth='1.35'
      />
      <circle cx='4.5' cy='4.5' r='4.5' transform='matrix(-1 0 0 1 11.7 2.7002)' fill='#868C98' />
    </svg>
  ),
  Pending: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#F27B2C'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C7.9101 2.7002 8.61016 2.86827 9.24291 3.19067C9.87565 3.51307 10.4231 3.98064 10.8405 4.55516C11.2579 5.12968 11.5335 5.79484 11.6445 6.49624C11.7556 7.19764 11.6992 7.91538 11.4797 8.59077C11.2603 9.26616 10.8841 9.88003 10.3819 10.3822C9.87978 10.8843 9.26592 11.2605 8.59053 11.4799C7.91514 11.6994 7.1974 11.7559 6.496 11.6448C5.79459 11.5337 5.12944 11.2582 4.55492 10.8408L7.19995 7.2002V2.7002Z'
        fill='#F27B2C'
      />
    </svg>
  ),
  Ongoing: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#375DFB'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C8.15026 2.7002 9.07617 3.00104 9.84498 3.55962C10.6138 4.1182 11.186 4.90582 11.4797 5.80962C11.7734 6.71341 11.7734 7.68698 11.4797 8.59077C11.186 9.49457 10.6138 10.2822 9.84498 10.8408L7.19995 7.2002V2.7002Z'
        fill='#375DFB'
      />
    </svg>
  ),
  Overdue: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#E63946'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C8.15026 2.7002 9.07617 3.00104 9.84498 3.55962C10.6138 4.1182 11.186 4.90582 11.4797 5.80962C11.7734 6.71341 11.7734 7.68698 11.4797 8.59077C11.186 9.49457 10.6138 10.2822 9.84498 10.8408C9.07617 11.3993 8.15026 11.7002 7.19995 11.7002C6.24964 11.7002 5.32373 11.3993 4.55492 10.8408C3.7861 10.2822 3.21386 9.49457 2.9202 8.59077C2.62654 7.68698 2.62654 6.71341 2.9202 5.80962L7.19995 7.2002V2.7002Z'
        fill='#E63946'
      />
    </svg>
  ),
  Completed: (
    <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='#079455'
        strokeWidth='1.35'
      />
      <path
        d='M7.19995 2.7002C8.15026 2.7002 9.07617 3.00104 9.84498 3.55962C10.6138 4.1182 11.186 4.90582 11.4797 5.80962C11.7734 6.71341 11.7734 7.68698 11.4797 8.59077C11.186 9.49457 10.6138 10.2822 9.84498 10.8408C9.07617 11.3993 8.15026 11.7002 7.19995 11.7002C6.24964 11.7002 5.32373 11.3993 4.55492 10.8408C3.7861 10.2822 3.21386 9.49457 2.9202 8.59077C2.62654 7.68698 2.62654 6.71341 2.9202 5.80962L7.19995 7.2002V2.7002Z'
        fill='#079455'
      />
    </svg>
  ),
};

/**
 * Task icon (clipboard/list) using currentColor for toolbar. Color is set via className based on task percentage.
 */
export function TaskIcon({ className, ...props }) {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      {...props}
    >
      <path
        d='M8 4h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0v2h8V4M8 8h8M8 12h5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

/**
 * Progress (pie) icon from SVG_MAP style, using currentColor for toolbar badge.
 * @param {number} percent - 0–100; fill amount from top clockwise (0 = empty, 100 = full circle).
 */
export function ProgressIcon({ className, percent = 0, ...props }) {
  const cx = 7.2;
  const cy = 7.2;
  const r = 6.525;
  const topY = 0.675;
  const p = Math.min(100, Math.max(0, percent));

  const isFull = p >= 100;
  const angle = (p / 100) * 2 * Math.PI;
  const endX = cx + r * Math.sin(angle);
  const endY = cy - r * Math.cos(angle);
  const largeArc = p > 50 ? 1 : 0;
  const wedgePath =
    p <= 0 ? null : `M ${cx} ${cy} L ${cx} ${topY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`;

  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 15 15'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      {...props}
    >
      <rect
        x='0.675'
        y='0.675'
        width='13.05'
        height='13.05'
        rx='6.525'
        stroke='currentColor'
        strokeWidth='1.35'
      />
      {isFull ? (
        <circle cx={cx} cy={cy} r={r} fill='currentColor' />
      ) : (
        wedgePath && <path d={wedgePath} fill='currentColor' />
      )}
    </svg>
  );
}

// Get status color from status value or option
export const getStatusColor = (status, statusOptions = []) => {
  if (!status) return STATUS_COLORS.closed;

  const normalized = String(status).toLowerCase();

  // Try to find color from status options first
  const statusOption = statusOptions.find(
    (opt) => opt.value?.toLowerCase() === normalized || opt.label?.toLowerCase() === normalized,
  );
  if (statusOption?.color) {
    // Map color names to hex if needed
    const colorMap = {
      blue: STATUS_COLORS.open,
      orange: STATUS_COLORS['in progress'],
      purple: STATUS_COLORS['on hold'],
      green: STATUS_COLORS.resolved,
      gray: STATUS_COLORS.closed,
      red: STATUS_COLORS.escalated,
    };
    return colorMap[statusOption.color.toLowerCase()] || STATUS_COLORS.closed;
  }

  // Fallback to direct mapping
  return STATUS_COLORS[normalized] || STATUS_COLORS.closed;
};

// Get status label from value
export const getStatusLabel = (value, statusOptions = []) => {
  if (!value) return '';
  const option = statusOptions.find(
    (opt) => opt.value?.toLowerCase() === String(value).toLowerCase(),
  );
  return option?.label || value;
};

// Status badge display component - can be used inside Select.Trigger or standalone
export const StatusBadgeDisplay = ({ status, color, showArrow = true }) => {
  if (!status) return null;
  return (
    <Badge.Root asChild color={color} size='small' className='rounded-md p-0 pr-1 h-[unset] gap-0'>
      <div className='text-white text-nowrap gap-0'>
        <div className='py-1.5 px-2 text-nowrap border-r border-white/40 h-full'>{status}</div>
        <div className='flex items-center justify-center shrink-0'>
          <RiArrowDownSLine
            className='size-4 text-white shrink-0'
            style={{ width: '16px', height: '16px' }}
          />
        </div>
      </div>
    </Badge.Root>
  );
};

/**
 * Filters status options based on user role.
 * Facility Manager can close tickets, so they see all statuses including 'Closed'.
 */
export const filterStatusOptionsForUser = (statusOptions = [], isFacilityManager = false) => {
  // All roles (including Facility Manager) can see and select all statuses, including Closed
  return statusOptions;
};

const StatusDropdown = ({
  value,
  onValueChange,
  statusOptions = [],
  disabled = false,
  placeholder = 'Select status',
  variant = 'inline', // inline = badge inside, full = full badge
  size = 'medium',
  hasError = false,
  className,
  isFacilityManager = false, // Filter 'Closed' status for Facility Manager
  ...rest
}) => {
  // Filter status options based on user role
  const filteredStatusOptions = useMemo(() => {
    return filterStatusOptionsForUser(statusOptions, isFacilityManager);
  }, [statusOptions, isFacilityManager]);

  const selectedStatus = value ? getStatusLabel(value, filteredStatusOptions) : null;
  const statusColor = getStatusColor(value, filteredStatusOptions);

  const isFull = variant === 'full';
  const isInline = variant === 'inline';

  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      size={size}
      hasError={hasError}
      variant='borderless'
      {...rest}
    >
      <Select.Trigger
        showArrow={isFull ? true : false}
        className={cn('w-auto flex items-center bg-transparent', className, isInline && 'p-0')}
        style={
          isFull && selectedStatus ? { backgroundColor: `var(--color-${statusColor}-500)` } : {}
        }
        arrowColor={isFull ? 'white' : ''}
        ringLess={true}
      >
        {/* --- FULL BADGE VARIANT --- */}
        {isFull && selectedStatus && <span className='text-white'>{selectedStatus}</span>}

        {/* --- INLINE VARIANT --- */}
        {isInline &&
          (selectedStatus ? (
            <StatusBadgeDisplay status={selectedStatus} color={statusColor} showArrow={true} />
          ) : (
            <Select.Value placeholder={placeholder} />
          ))}
      </Select.Trigger>

      <Select.Content className='min-w-[200px]'>
        {filteredStatusOptions.map((option) => {
          const optionValue = option.value || option;
          const optionLabel = option.label || option;
          const isSelected = value === optionValue;
          return (
            <Select.Item
              key={optionValue}
              value={optionValue}
              className='mb-1'
              {...(isSelected && { 'data-highlighted': 'true' })}
            >
              <div className='flex items-center gap-1.5'>
                {SVG_MAP[optionValue]}
                <span className='text-paragraph-sm text-text-main-900 text-nowrap'>
                  {optionLabel}
                </span>
              </div>
            </Select.Item>
          );
        })}
      </Select.Content>
    </Select.Root>
  );
};

export default StatusDropdown;
