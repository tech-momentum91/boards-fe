import React, { useCallback, useMemo } from 'react';

import {
  buildProjectBoqAreaLocationOptions,
  formatProjectBoqAreaLocations,
  parseProjectBoqAreaLocations,
} from '@/components/boq/boq-templates/components/boq-template-products-utils';
import { BOQ_TEMPLATE_EDIT_FIELD_ATTR } from '@/components/boq/boq-templates/components/boq-template-product-edit-utils';
import { PROJECT_BOQ_DEFAULT_AREA_LOCATION } from '@/components/boq/constants';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const BoqTemplateAreaLocationDropdown = ({
  value,
  projectAreas = [],
  onValueChange,
  disabled = false,
  editFieldId,
  placeholder = 'Area/ location',
  size = 'xsmall',
}) => {
  const options = useMemo(() => buildProjectBoqAreaLocationOptions(projectAreas), [projectAreas]);

  const selectedValues = useMemo(() => parseProjectBoqAreaLocations(value), [value]);

  const handleValueChange = useCallback(
    (nextValues = []) => {
      const nextList = Array.isArray(nextValues) ? nextValues : [];
      const hasSpecific = nextList.some((entry) => entry !== PROJECT_BOQ_DEFAULT_AREA_LOCATION);
      const normalized = hasSpecific
        ? nextList.filter((entry) => entry !== PROJECT_BOQ_DEFAULT_AREA_LOCATION)
        : nextList.length > 0
          ? nextList
          : [PROJECT_BOQ_DEFAULT_AREA_LOCATION];

      onValueChange?.(formatProjectBoqAreaLocations(normalized));
    },
    [onValueChange],
  );

  return (
    <div
      className={cn('w-full min-w-0')}
      data-prevent-row-click
      {...(editFieldId ? { [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: editFieldId } : {})}
    >
      <SearchableSelect
        multiple
        value={selectedValues}
        onValueChange={handleValueChange}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder='Search areas...'
        emptyMessage='No areas available'
        noResultsMessage='No areas found'
        size={size}
        showArrow
        contentClassName='min-w-[max(var(--radix-popover-trigger-width),240px)]'
      />
    </div>
  );
};

export default BoqTemplateAreaLocationDropdown;
