import { useEffect, useState } from 'react';
import { getCrmLeadOptions } from '@/api/crmLeads';

export function useCrmLeadSizeOptions() {
  const [leadSizeOptions, setLeadSizeOptions] = useState([]);

  useEffect(() => {
    let alive = true;
    getCrmLeadOptions()
      .then((opts) => {
        if (!alive) return;
        setLeadSizeOptions(Array.isArray(opts.lead_size) ? opts.lead_size : []);
      })
      .catch(() => {
        if (!alive) return;
        setLeadSizeOptions([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return leadSizeOptions;
}
