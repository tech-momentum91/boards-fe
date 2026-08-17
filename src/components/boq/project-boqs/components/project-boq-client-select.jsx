import React from 'react';

import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const ProjectBoqClientSelect = ({
  value,
  onValueChange,
  options = [],
  error,
  placeholder = 'Select',
  disabled = false,
}) => {
  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder='Search client...'
      emptyMessage='No clients available'
      noResultsMessage='No clients found'
      disabled={disabled}
      hasError={Boolean(error)}
      showArrow
      matchTriggerWidth
      triggerClassName={cn('w-full')}
    />
  );
};

export default ProjectBoqClientSelect;
