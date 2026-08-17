import { useState } from 'react';

import { AUM_SEARCH_DEBOUNCE_MS } from '@/components/aum/constants';
import { useDebounce } from '@/hooks/use-debounce';

/** Immediate input value + debounced query for AUM list API / client filters. */
export function useAumSearch(initialValue = '') {
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedSearch = useDebounce(searchValue.trim(), AUM_SEARCH_DEBOUNCE_MS);

  return { searchValue, setSearchValue, debouncedSearch };
}
