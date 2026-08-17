import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** @param {{ id?: string; name?: string } | null | undefined} row */
export function getLeadIdFromRow(row) {
  return row?.id || row?.name || '';
}

/**
 * @param {string} leadId
 * @param {'contacts'} [tab]
 * @returns {string | null}
 */
export function getCrmLeadDetailPath(leadId, tab) {
  const id = leadId == null ? '' : String(leadId).trim();
  if (!id) return null;
  const encoded = encodeURIComponent(id);
  if (tab === 'contacts') return `/crm/leads/${encoded}?tab=contacts`;
  return `/crm/leads/${encoded}`;
}

/** Row click + contact cell navigation for CRM Leads tables. */
export function useCrmLeadNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  const fromRef = useRef(from);
  fromRef.current = from;

  const onLeadRowClick = useCallback(
    (row) => {
      const path = getCrmLeadDetailPath(getLeadIdFromRow(row));
      if (path) navigate(path, { state: { from: fromRef.current } });
    },
    [navigate],
  );

  const onLeadContactClick = useCallback(
    (row) => {
      const path = getCrmLeadDetailPath(getLeadIdFromRow(row), 'contacts');
      if (path) navigate(path, { state: { from: fromRef.current } });
    },
    [navigate],
  );

  return { onLeadRowClick, onLeadContactClick };
}
