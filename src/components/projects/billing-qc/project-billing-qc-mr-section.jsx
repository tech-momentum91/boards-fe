import React, { useEffect, useMemo, useState } from 'react';
import { RiDownloadLine, RiLayoutColumnLine, RiLinkM, RiSearch2Line } from 'react-icons/ri';
import ProjectBillingQcJmrTable from '@/components/projects/billing-qc/project-billing-qc-jmr-table';
import { getBillingQcMrDetail } from '@/api/projectBillingQc';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  PROJECT_DETAIL_BILLING_QC_MR_COLUMNS,
  buildProjectDetailBillingQcFloorFilters,
  getStoredProjectDetailBillingQcMrColumnConfig,
  saveStoredProjectDetailBillingQcMrColumnConfig,
} from '@/components/projects/constants';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

export default function ProjectBillingQcMrSection({ vendorId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [seedAreas, setSeedAreas] = useState([]);
  const [mrStatus, setMrStatus] = useState(null);
  const [mrItemCount, setMrItemCount] = useState(0);

  const columnConfig = useColumnConfig(
    'project-detail-billing-qc-mr',
    PROJECT_DETAIL_BILLING_QC_MR_COLUMNS,
    saveStoredProjectDetailBillingQcMrColumnConfig,
    getStoredProjectDetailBillingQcMrColumnConfig,
    { autoSave: true, debounce: 200, pinnedColumnId: 'subarea' },
  );

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;

    getBillingQcMrDetail(vendorId)
      .then((response) => {
        if (cancelled) return;
        setSeedAreas(Array.isArray(response?.areas) ? response.areas : []);
        setMrStatus(response?.mrStatus ?? null);
        setMrItemCount(response?.mrItemCount ?? 0);
      })
      .catch((error) => showErrorToast(extractErrorMessage(error)));

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const areaFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Areas' },
      ...(Array.isArray(seedAreas) ? seedAreas : []).map((area) => {
        const floorLabel = String(
          area?.floor_badge ?? area?.floorLabel ?? area?.floor ?? '',
        ).trim();
        return {
          value: area.id,
          label: floorLabel ? `${area.name} (${floorLabel})` : area.name,
        };
      }),
    ],
    [seedAreas],
  );
  const floorFilters = useMemo(
    () => buildProjectDetailBillingQcFloorFilters(seedAreas),
    [seedAreas],
  );

  const emptyStateMessage = useMemo(() => {
    if (mrStatus === 'Draft' && mrItemCount > 0) {
      return `Vendor has not submitted MR yet (${mrItemCount} draft line${mrItemCount === 1 ? '' : 's'}). Measurements will appear here after vendor submission.`;
    }
    if (mrStatus === 'Draft') {
      return 'Waiting for vendor measurement submission from Vendor Portal → Work Orders → MR tab.';
    }
    if (!mrStatus) {
      return 'No vendor measurement record found for this work order.';
    }
    return 'No MR records found.';
  }, [mrItemCount, mrStatus]);

  const areas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sourceAreas = Array.isArray(seedAreas) ? seedAreas : [];

    return sourceAreas
      .filter((area) => areaFilter === 'all' || area.id === areaFilter)
      .filter((area) => floorFilter === 'all' || area.floor === floorFilter)
      .map((area) => ({
        ...area,
        categories: (area.categories ?? [])
          .map((category) => ({
            ...category,
            readOnly: true,
            items: (category.items ?? []).filter((item) => {
              if (!query) return true;
              return [item.subarea, item.po_item, item.description, item.uom]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
            }),
          }))
          .filter((category) => !query || category.items.length > 0),
      }))
      .filter((area) => {
        if (query) return area.categories.length > 0;
        return true;
      });
  }, [areaFilter, floorFilter, searchQuery, seedAreas]);

  return (
    <div className='flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden'>
      <div className='flex shrink-0 flex-col gap-3'>
        <div className='flex w-full min-w-0 items-center justify-between gap-3'>
          <div className='w-[370px] shrink-0'>
            <Input.Root size='xsmall'>
              <Input.Wrapper>
                <Input.Icon as={RiSearch2Line} />
                <Input.Input
                  placeholder='Search here...'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex min-w-0 flex-1 items-center justify-end gap-3'>
            <div className='shrink-0'>
              <SearchableSelect
                variant='compact'
                size='xsmall'
                value={areaFilter}
                onValueChange={setAreaFilter}
                options={areaFilterOptions}
                placeholder='All Areas'
                searchPlaceholder='Search areas...'
                emptyMessage='No areas available'
                noResultsMessage='No areas found'
                showArrow
                triggerClassName='w-[120px]'
                contentClassName='min-w-[280px] max-w-[min(100vw-2rem,400px)]'
              />
            </div>

            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              config={columnConfig}
              pinnedColumnId='subarea'
              tooltipContent={<p>Manage columns</p>}
              trigger={
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  className='shrink-0'
                  aria-label='Manage columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />

            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='shrink-0'
              aria-label='Download'
            >
              <Button.Icon as={RiDownloadLine} />
            </Button.Root>

            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='shrink-0'
              aria-label='Copy link'
            >
              <Button.Icon as={RiLinkM} />
            </Button.Root>
          </div>
        </div>

        <ButtonGroup.Root size='xsmall' className='w-fit shrink-0'>
          {floorFilters.map((filter) => {
            const isActive = floorFilter === filter.id;
            return (
              <ButtonGroup.Item
                key={filter.id}
                data-state={isActive ? 'on' : 'off'}
                onClick={() => setFloorFilter(filter.id)}
                className={cn(
                  isActive &&
                    'z-[1] bg-primary-alpha-10 text-primary-base ring-primary-base hover:bg-primary-alpha-10',
                )}
              >
                {filter.label}
              </ButtonGroup.Item>
            );
          })}
        </ButtonGroup.Root>

        <div className='h-px w-full bg-[#E8E9ED] opacity-30' />
      </div>

      <div className='min-h-0 flex-1 overflow-auto'>
        <div className='min-w-max pb-6'>
          <ProjectBillingQcJmrTable
            areas={areas}
            columnConfig={columnConfig.columns}
            viewMode='mr'
            emptyStateMessage={emptyStateMessage}
          />
        </div>
      </div>
    </div>
  );
}
