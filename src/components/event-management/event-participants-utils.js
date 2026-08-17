import React from 'react';
import * as Tooltip from '@/components/ui/tooltip';
import {
  PARTICIPANT_COLUMN_WIDTH_CLASS,
  PARTICIPANT_NAME_TRUNCATE_LIMIT,
  PARTICIPANTS_FLAT_GROUP_CONTEXT,
} from '@/components/event-management/constant';

export function participantsToolbarLabelToGroupByApi(label) {
  if (label === 'Center') return 'center';
  if (label === 'Client') return 'client';
  return '';
}

export function findScrollableParent(el) {
  let p = el?.parentElement;
  while (p) {
    const style = getComputedStyle(p);
    const oy = style.overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return p;
    p = p.parentElement;
  }
  return null;
}

export function participantRowKey(row, groupContextLabel) {
  const cid = String(row?.customer_id ?? '').trim();
  const fallback = String(row?.id ?? '').trim();
  const rowCenter = String(row?.center_name ?? row?.center ?? '')
    .trim()
    .toLowerCase();
  const rowClient = String(row?.client_name ?? row?.participant_name ?? '')
    .trim()
    .toLowerCase();
  const ctx = String(groupContextLabel ?? '')
    .trim()
    .toLowerCase();
  return `${cid || fallback || 'row'}::${rowCenter}::${rowClient}::${ctx}`;
}

export function formatBackendParticipantsPct(raw) {
  if (raw == null || raw === '' || !Number.isFinite(Number(raw))) return null;
  const n = Number(raw);
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}%`;
}

export function formatParticipantsPctDisplay(row) {
  return formatBackendParticipantsPct(row?.participants_pct_value) ?? '--';
}

export function statsRowGroupContext(row, groupByLabel) {
  if (groupByLabel === 'Client') {
    return (
      String(row?.client_name ?? row?.participant_name ?? '').trim() ||
      PARTICIPANTS_FLAT_GROUP_CONTEXT
    );
  }
  return String(row?.center_name ?? row?.center ?? '').trim() || PARTICIPANTS_FLAT_GROUP_CONTEXT;
}

export function formatApiParticipantsPctValue(n) {
  if (n == null || !Number.isFinite(Number(n))) return '--';
  const num = Number(n);
  const rounded = Math.round(num * 100) / 100;
  return `${rounded}%`;
}

export function getMergedRowFields(row, groupCenter, overrides) {
  const key = participantRowKey(row, groupCenter);
  const o = overrides[key] || {};
  const seats = row.no_of_seats;

  let expected_seats;
  if (o.expected_seats !== undefined) {
    expected_seats = o.expected_seats;
  } else {
    const apiEx = row.expected_seats;
    if (apiEx === '' || apiEx == null) {
      expected_seats = '';
    } else if (Number.isFinite(Number(apiEx))) {
      expected_seats = Number(apiEx);
    } else {
      expected_seats = apiEx;
    }
  }

  const remarks = o.remarks !== undefined ? o.remarks : (row.remarks ?? '');

  return {
    no_of_seats: seats,
    expected_seats,
    remarks,
  };
}

export function resolveCenterIdFromRow(raw, groupCenterLabel) {
  if (!raw || typeof raw !== 'object') return '';
  const centers = raw.centers;
  if (!Array.isArray(centers) || centers.length === 0) return '';
  const needle = String(groupCenterLabel || '')
    .trim()
    .toLowerCase();
  const match = centers.find((c) => {
    const name = String(c?.name ?? c?.center_name ?? '')
      .trim()
      .toLowerCase();
    return name === needle;
  });
  const id = match?.id;
  return id != null ? String(id).trim() : '';
}

export function formatSeatDisplay(value) {
  if (value === '' || value == null) return '--';
  return String(value);
}

export function normalizedKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function normalizedIdentifierKey(value) {
  const key = normalizedKey(value);
  if (!key || key === '--' || key === '-' || key === 'n/a' || key === '[object object]') {
    return '';
  }
  return key;
}

export function candidateKeysFromValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => candidateKeysFromValue(item));
  }
  if (value && typeof value === 'object') {
    const picked = [
      value.id,
      value.name,
      value.value,
      value.label,
      value.center_id,
      value.center,
      value.centre,
      value.center_name,
      value.centre_name,
      value.customer_id,
      value.customer,
      value.client,
      value.customer_name,
      value.client_name,
      value.participant_name,
      value.event_customer,
    ];
    return picked.flatMap((item) => candidateKeysFromValue(item));
  }
  const key = normalizedIdentifierKey(value);
  return key ? [key] : [];
}

export function truncateParticipantName(value, limit = PARTICIPANT_NAME_TRUNCATE_LIMIT) {
  const text = String(value ?? '').trim();
  if (!text) return '--';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}..`;
}

export function ParticipantTextCellWithTooltip({ text, strong = false, className = '' }) {
  const fullText = String(text ?? '').trim();
  const displayText = truncateParticipantName(fullText);
  const hasText = Boolean(fullText);
  const textClass = strong
    ? 'paragraph-small text-text-strong-950'
    : 'paragraph-small text-text-sub-600';
  const mergedClassName = `${textClass} ${className}`.trim();

  if (!hasText) {
    return React.createElement('span', { className: mergedClassName }, '--');
  }

  return React.createElement(
    Tooltip.Root,
    null,
    React.createElement(
      Tooltip.Trigger,
      { asChild: true },
      React.createElement('span', { className: `${mergedClassName} cursor-default` }, displayText),
    ),
    React.createElement(
      Tooltip.Content,
      null,
      React.createElement('span', { className: 'paragraph-xsmall' }, fullText),
    ),
  );
}

export function participantColumnWidthClass(columnId) {
  return PARTICIPANT_COLUMN_WIDTH_CLASS[columnId] || '';
}
