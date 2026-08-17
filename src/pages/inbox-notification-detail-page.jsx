import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  RiArrowLeftSLine,
  RiMailOpenLine,
  RiMailUnreadLine,
  RiCheckDoubleLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
} from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { InboxTimelineWithReply } from '@/components/inbox/inbox-timeline';
import inboxStaticData from '@/data/inbox-static-data.json';
import InboxSnoozePopover from '@/components/inbox/inbox-snooze-popover';
import apiClient from '@/api/axios';
import notificationService from '@/services/notification-service';
import { setNotificationItems } from '@/redux/notificationSlice';
import MyTaskDetailDrawers from '@/components/my-tasks/my-task-detail-drawers';
import { getMyTaskDrawerKind } from '@/components/my-tasks/my-task-constants';

const allPrimary = inboxStaticData.primary ?? [];
const allOther = inboxStaticData.other ?? [];
const allLater = inboxStaticData.later ?? [];

const findItemById = (id) =>
  allPrimary.find((i) => i.id === id) ||
  allOther.find((i) => i.id === id) ||
  allLater.find((i) => i.id === id);

// // Mock conversations for CommentsTimeline (comments + history)
// const MOCK_CONVERSATIONS = {
//   comments: [
//     {
//       id: 'cmt-1',
//       name: 'cmt-1',
//       content: 'They are expanding to Jaipur and Pune. We need to find offices there',
//       creation: '2025-11-12T08:40:00',
//       commented_by: 'Arlene McCoy',
//       user: { name: 'Arlene McCoy', image: null },
//       attachments: [],
//       custom_visible_to_client: false,
//       custom_parent_comment: null,
//       parent_comment: null,
//     },
//     {
//       id: 'cmt-2',
//       name: 'cmt-2',
//       content:
//         '<p>Briefing Call 13.01.2026 : IBS Facility || PhiDesign</p><p>Hi,<br/>PFA attendance details.<br/>Terrace Development – Briefing Call with the Facility Team<br/>Kandasamy Palanisamy</p>',
//       creation: '2025-11-08T09:05:00',
//       commented_by: 'Facility@ibspc.com',
//       user: { name: 'Facility@ibspc.com', image: null },
//       attachments: [],
//       custom_visible_to_client: false,
//       custom_parent_comment: null,
//       parent_comment: null,
//       meta: { to: 'muskan@phidesigns.in', type: 'email' },
//     },
//     {
//       id: 'cmt-3',
//       name: 'cmt-3',
//       content:
//         "<p>Hi,</p><p>Thanks for reporting this. We're working on restoring Wi-Fi connectivity as quickly as possible.</p>",
//       creation: '2025-11-08T09:05:01',
//       commented_by: 'muskan@phidesigns.in',
//       user: { name: 'muskan@phidesigns.in', image: null },
//       attachments: [],
//       custom_visible_to_client: false,
//       custom_parent_comment: null,
//       parent_comment: null,
//       meta: { to: 'Facility@ibspc.com', type: 'email' },
//     },
//     {
//       id: 'cmt-reply-1',
//       name: 'cmt-reply-1',
//       content:
//         '<p>Can you please confirm if the issue is affecting all devices or specific ones? This will help us troubleshoot faster.</p>',
//       creation: '2025-11-13T08:40:00',
//       commented_by: 'Ralph Edwards',
//       user: { name: 'Ralph Edwards', image: null },
//       attachments: [],
//       custom_visible_to_client: false,
//       custom_parent_comment: null,
//       parent_comment: { id: 'cmt-1', name: 'cmt-1' },
//     },
//     {
//       id: 'cmt-4',
//       name: 'cmt-4',
//       content:
//         '<p>Hi,</p><p>Please find the updated proposal for the Terrace Development project attached.</p>',
//       creation: '2025-11-08T09:05:02',
//       commented_by: 'Facility@ibspc.com',
//       user: { name: 'Facility@ibspc.com', image: null },
//       attachments: [{ name: 'Terrace_Proposal_v2.pdf', file_url: '#', size: 245000 }],
//       custom_visible_to_client: false,
//       custom_parent_comment: null,
//       parent_comment: null,
//       meta: {
//         to: 'muskan@phidesigns.in',
//         cc: 'support.devx.com',
//         bcc: 'support.devx.com',
//         type: 'email',
//       },
//     },
//   ],
//   history: [
//     {
//       id: 'hist-1',
//       name: 'hist-1',
//       action: 'changed the status',
//       owner: 'Urbenco',
//       creation: '2025-11-12T08:40:00',
//     },
//     {
//       id: 'hist-2',
//       name: 'hist-2',
//       action: 'updated the deal stage to IN DISCUSSION',
//       owner: 'Rajesh Kumar',
//       creation: '2025-11-10T14:20:00',
//     },
//     {
//       id: 'hist-3',
//       name: 'hist-3',
//       action: 'added a new contact Sajas K',
//       owner: 'Rajesh Kumar',
//       creation: '2025-11-09T11:00:00',
//     },
//     {
//       id: 'hist-4',
//       name: 'hist-4',
//       action: 'created the account',
//       owner: 'System',
//       creation: '2025-11-01T10:00:00',
//     },
//   ],
// };

const CURRENT_USER_NAME = 'You';

function buildFromDoctypes(raw) {
  const from_doctypes = {};
  (raw?.activities || []).forEach((a) => {
    const doctype = a.from_doctype;
    const vid = a.version_id || a.name;
    if (!doctype || !vid) return;
    if (!from_doctypes[doctype]) from_doctypes[doctype] = { version_ids: [] };
    from_doctypes[doctype].version_ids.push(vid);
  });
  return from_doctypes;
}

/** Derive timeline comments + history from get_notifications item.raw.activities (single source of truth, no separate API) */
function activitiesToTimeline(raw) {
  const activities = Array.isArray(raw?.activities) ? raw.activities : [];
  const comments = [];
  const history = [];
  activities.forEach((a) => {
    const doctype = a.from_doctype;
    if (doctype === 'HD Ticket Comment' || (a.content != null && (a.name || a.version_id))) {
      comments.push({
        id: a.name ?? a.version_id,
        name: a.name ?? a.version_id,
        content: a.content ?? '',
        creation: a.creation,
        commented_by: a.commented_by ?? a.owner ?? (a.user && (a.user.name || a.user.email)),
        user: a.user ?? { name: a.owner ?? '', image: null },
        attachments: a.attachments ?? [],
        custom_visible_to_client: a.custom_visible_to_client ?? false,
        custom_parent_comment: a.custom_parent_comment ?? null,
        parent_comment:
          a.parent_comment ??
          (a.custom_parent_comment
            ? { id: a.custom_parent_comment, name: a.custom_parent_comment }
            : null),
      });
    } else {
      const ch0 = Array.isArray(a.changes) && a.changes[0] ? a.changes[0] : null;
      const msg = ch0?.message ?? 'Updated';
      const fieldKey = ch0?.field || ch0?.label || '';
      const displayName = (a.user && (a.user.full_name || a.user.name)) || a.owner || '';
      history.push({
        id: a.version_id ?? a.name,
        name: a.version_id ?? a.name,
        action: msg,
        field: fieldKey,
        owner: displayName,
        user: a.user
          ? {
              ...a.user,
              name: a.user.full_name || a.user.name || a.user.email,
            }
          : null,
        creation: a.creation,
      });
    }
  });
  return { comments, history };
}

/**
 * Prefer API ``raw.drawer_row``; otherwise build a minimal My-Tasks row from source
 * ``doctype`` / ``docname`` / ``title`` so ``MyTaskDetailDrawers`` can open without backend extras.
 */
function inferInboxDrawerRow(raw, primaryText) {
  if (!raw || typeof raw !== 'object') return null;
  const existing = raw.drawer_row;
  if (existing && typeof existing === 'object' && getMyTaskDrawerKind(existing)) {
    return existing;
  }
  const dt = String(raw.doctype || '').trim();
  const name = String(raw.docname || '').trim();
  if (!dt || !name) return null;
  const title = String(raw.title || primaryText || name || '').trim() || name;

  let row = null;
  if (dt === 'HD Ticket') {
    row = {
      name,
      title,
      module: 'Ticket',
      submodule: 'Ticket',
      assignees: [],
      center: null,
      due_date: null,
      status: null,
      priority: null,
    };
  } else if (dt === 'Agreement') {
    row = {
      name,
      title,
      module: 'Agreement',
      submodule: 'Agreement',
      assignees: [],
      center: null,
      due_date: null,
      status: null,
      priority: null,
    };
  } else if (dt === 'Operating Expenses') {
    row = {
      name,
      title,
      module: 'Center',
      submodule: 'OPEX',
      assignees: [],
      center: null,
      due_date: null,
      status: null,
      priority: null,
    };
  }
  if (row && getMyTaskDrawerKind(row)) return row;
  return null;
}

const InboxNotificationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [fetchedItem, setFetchedItem] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const item = fetchedItem ?? findItemById(id);
  const orderedItems = location.state?.orderedItems ?? [];
  const inboxTab = location.state?.inboxTab ?? 'primary';
  const currentIndex = orderedItems.findIndex((i) => i.id === id);
  const previousId = currentIndex > 0 ? (orderedItems[currentIndex - 1]?.id ?? null) : null;
  const nextId =
    currentIndex >= 0 && currentIndex < orderedItems.length - 1
      ? (orderedItems[currentIndex + 1]?.id ?? null)
      : null;

  const [markAsRead, setMarkAsRead] = useState(() => item?.markAsRead ?? false);
  const [clearedOverride, setClearedOverride] = useState(false);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const nextCommentIdRef = useRef(0);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  const effectiveDrawerRow = useMemo(
    () => inferInboxDrawerRow(item?.raw, item?.primaryText),
    [item?.raw, item?.primaryText],
  );

  const canOpenDetailDrawer = Boolean(effectiveDrawerRow);

  useEffect(() => {
    setDetailDrawerOpen(false);
  }, [id]);

  useEffect(() => {
    if (!canOpenDetailDrawer) setDetailDrawerOpen(false);
  }, [canOpenDetailDrawer]);

  const refreshNotificationDetail = useCallback(() => {
    if (!id) return;
    notificationService
      .getNotificationById(id, undefined, inboxTab)
      .then((data) => {
        if (data) setFetchedItem(data);
      })
      .catch(() => {});
  }, [id, inboxTab]);

  // Always fetch notification details by id from API (never use location state for detail data)
  useEffect(() => {
    if (!id) {
      setLoadingDetail(false);
      return;
    }
    setFetchedItem(null);
    setFetchError(null);
    setLoadingDetail(true);
    let cancelled = false;
    notificationService
      .getNotificationById(id, undefined, inboxTab)
      .then((data) => {
        if (cancelled) return;
        setFetchedItem(data ?? null);
        if (data) {
          setMarkAsRead(Boolean(data.markAsRead));
          dispatch(setNotificationItems([data]));
          // Mark as read when opening the detail page (if currently unread)
          if (!data.markAsRead && data.raw?.doctype && data.raw?.docname) {
            const from_doctypes = buildFromDoctypes(data.raw);
            let readScope = 'primary';
            if (inboxTab === 'later') readScope = 'later';
            else if (inboxTab === 'cleared') readScope = 'cleared';
            notificationService
              .markAsRead(
                data.raw.doctype,
                data.raw.docname,
                from_doctypes,
                true,
                undefined,
                readScope,
              )
              .then(() => setMarkAsRead(true))
              .catch(() => {});
          }
        }
      })
      .catch((error) => {
        if (!cancelled) setFetchError(error?.message || 'Failed to load notification');
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, dispatch, inboxTab]);

  const docname = item?.raw?.docname ?? item?.docname;
  const isHdTicket = item?.doctype === 'HD Ticket';
  const raw = item?.raw;

  useEffect(() => {
    if (!raw) return;
    if (raw.activities?.length) {
      const { comments: c, history: h } = activitiesToTimeline(raw);
      setComments(c);
      setHistory(h);
    } else {
      // setComments([...(MOCK_CONVERSATIONS.comments ?? [])]);
      // setHistory([...(MOCK_CONVERSATIONS.history ?? [])]);
    }
  }, [id, raw]);

  const hasPrevious = Boolean(previousId);
  const hasNext = Boolean(nextId);

  const handleBack = useCallback(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get('from') === 'my-task') {
      const t = sp.get('tab');
      if (t === 'taskInbox') {
        navigate('/my-task?tab=taskInbox');
      } else if (t === 'task') {
        const st = sp.get('subTab') || sp.get('subTask') || 'All';
        navigate(`/my-task?tab=task&subTab=${encodeURIComponent(st)}`);
      } else {
        navigate('/my-task');
      }
      return;
    }
    navigate('/inbox');
  }, [navigate, location.search]);

  const handleOpenDetailDrawer = useCallback(() => {
    if (!canOpenDetailDrawer) return;
    setDetailDrawerOpen(true);
  }, [canOpenDetailDrawer]);

  const sourceDoctype = item?.raw?.doctype ?? item?.doctype;

  const detailQuery = location.search || '';

  const handlePrevious = useCallback(() => {
    if (!previousId) return;
    navigate(`/inbox/notification-details/${encodeURIComponent(previousId)}${detailQuery}`, {
      state: { orderedItems, inboxTab },
      replace: false,
    });
  }, [navigate, orderedItems, previousId, inboxTab, detailQuery]);

  const handleNext = useCallback(() => {
    if (!nextId) return;
    navigate(`/inbox/notification-details/${encodeURIComponent(nextId)}${detailQuery}`, {
      state: { orderedItems, inboxTab },
      replace: false,
    });
  }, [navigate, orderedItems, nextId, inboxTab, detailQuery]);

  const handleMarkAsReadClick = useCallback(async () => {
    if (!raw?.doctype || !raw?.docname) return;
    const from_doctypes = buildFromDoctypes(raw);
    const newRead = !markAsRead;
    let readScope = 'primary';
    if (inboxTab === 'later') readScope = 'later';
    else if (inboxTab === 'cleared') readScope = 'cleared';
    try {
      await notificationService.markAsRead(
        raw.doctype,
        raw.docname,
        from_doctypes,
        newRead,
        undefined,
        readScope,
      );
      setMarkAsRead(newRead);
    } catch {
      // Optionally show error toast
    }
  }, [raw, markAsRead, inboxTab]);

  const handleClear = useCallback(async () => {
    if (!raw?.doctype || !raw?.docname) return;
    const from_doctypes = buildFromDoctypes(raw);
    const closed_activity_id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date();
    const closed_time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    try {
      await notificationService.markAsClosed(raw.doctype, raw.docname, from_doctypes, true, {
        closed_time,
        closed_activity_id,
      });
      setClearedOverride(true);
    } catch {
      // Optionally show error toast
    }
  }, [raw]);

  const handleUnclear = useCallback(async () => {
    if (!raw?.doctype || !raw?.docname) return;
    const from_doctypes = buildFromDoctypes(raw);
    try {
      await notificationService.markAsClosed(raw.doctype, raw.docname, from_doctypes, false);
      setClearedOverride(false);
    } catch {
      // Optionally show error toast
    }
  }, [raw]);

  const handleSnooze = useCallback(
    async (optionValue) => {
      if (!raw?.doctype || !raw?.docname) return;
      const from_doctypes = buildFromDoctypes(raw);
      try {
        await notificationService.snooze(raw.doctype, raw.docname, from_doctypes, optionValue);
        // Optionally navigate back or refresh; item will move to Later tab on next load
      } catch {
        // Optionally show error toast
      }
    },
    [raw],
  );

  const handleUnsnooze = useCallback(async () => {
    if (!raw?.doctype || !raw?.docname) return;
    const from_doctypes = buildFromDoctypes(raw);
    try {
      await notificationService.unsnooze(raw.doctype, raw.docname, from_doctypes);
    } catch {
      // Optionally show error toast
    }
  }, [raw]);

  const isSnoozed = raw?.snoozed === 1 || raw?.snoozed === true;

  const handleAddComment = useCallback(
    async (notificationId, content, attachments, isVisibleToClient, parentCommentId) => {
      const hasContent =
        content &&
        String(content)
          .replaceAll(/<[^>]*>/g, '')
          .trim();
      const hasAttachments = attachments && attachments.length > 0;
      if (!hasContent && !hasAttachments) return;

      const uniqueId = `cmt-${Date.now()}-${nextCommentIdRef.current++}`;
      const fallbackComment = {
        id: uniqueId,
        name: uniqueId,
        content: content || '<p></p>',
        creation: new Date().toISOString(),
        commented_by: CURRENT_USER_NAME,
        user: { name: CURRENT_USER_NAME, image: null },
        attachments: (attachments || []).map((a) => ({
          name: a?.name ?? '',
          file_url: a?.file_url ?? '#',
          size: a?.size ?? 0,
        })),
        custom_visible_to_client: Boolean(isVisibleToClient),
        custom_parent_comment: parentCommentId ?? null,
        parent_comment: parentCommentId ? { id: parentCommentId, name: parentCommentId } : null,
      };

      if (isHdTicket && docname) {
        const formData = new FormData();
        formData.append('ticket', String(docname));
        formData.append('content', content || '');
        formData.append('visible_to_client', isVisibleToClient ? '1' : '0');
        formData.append('custom_parent_comment', parentCommentId || 'esua9a39kt');
        if (attachments?.length) {
          attachments.forEach((a) => {
            if (a?.file) formData.append('files[]', a.file);
          });
        }
        try {
          const response = await apiClient.post(
            '/method/devx.api.ticket.add_ticket_comment_with_files',
            formData,
          );
          const created = response?.data?.message;
          const toAdd =
            created && (created.name != null || created.id != null)
              ? {
                  ...fallbackComment,
                  ...created,
                  parent_comment: parentCommentId
                    ? { id: parentCommentId, name: parentCommentId }
                    : null,
                }
              : fallbackComment;
          setComments((previous) => [...previous, toAdd]);
        } catch {
          // Optionally show error toast
        }
        return;
      }

      setComments((previous) => [...previous, fallbackComment]);
    },
    [isHdTicket, docname],
  );

  if (!item) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col'>
          <header className='flex shrink-0 items-start justify-between gap-4 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-4'>
            <div className='flex min-w-0 flex-1 items-start gap-4'>
              <button
                type='button'
                onClick={handleBack}
                className='mt-1 flex shrink-0 items-center justify-center rounded-lg p-1.5 text-text-sub-600 hover:bg-bg-weak-100 hover:text-text-strong-950'
                aria-label='Back to Inbox'
              >
                <RiArrowLeftSLine size={24} />
              </button>
              <div className='min-w-0 flex-1'>
                <p className='paragraph-small text-text-sub-500'>Inbox</p>
                <h1 className='text-label-lg font-medium text-text-strong-950 truncate mt-0.5'>
                  {loadingDetail ? 'Loading…' : 'Notification not found'}
                </h1>
              </div>
            </div>
          </header>
          <div className='flex flex-1 flex-col px-8 py-8'>
            {loadingDetail ? (
              <div className='flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-lg bg-bg-weak-50 py-16'>
                <div className='h-8 w-8 rounded-full border-4 border-primary-base border-t-transparent animate-spin' />
                <p className='paragraph-small text-text-sub-500'>Loading notification…</p>
              </div>
            ) : (
              <div className='flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-lg bg-bg-weak-50 py-16'>
                <p className='paragraph-small text-text-sub-500'>Notification not found.</p>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  const isCleared = item.clear === true || clearedOverride;

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full flex-col'>
        {/* Header */}
        <header className='flex shrink-0 items-start justify-between gap-4 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-4'>
          <div className='flex min-w-0 flex-1 items-start gap-4'>
            <button
              type='button'
              onClick={handleBack}
              className='mt-1 flex shrink-0 items-center justify-center rounded-lg p-1.5 text-text-sub-600 hover:bg-bg-weak-100 hover:text-text-strong-950'
              aria-label='Back to Inbox'
            >
              <RiArrowLeftSLine size={24} />
            </button>
            {canOpenDetailDrawer && !detailDrawerOpen ? (
              <button
                type='button'
                onClick={handleOpenDetailDrawer}
                className='min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left outline-none transition-colors hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-stroke-strong-950 focus-visible:ring-offset-2'
                aria-label='View linked record'
              >
                <p className='paragraph-small text-text-sub-500'>
                  {sourceDoctype
                    ? `${sourceDoctype === 'HD Ticket' ? 'Tickets' : sourceDoctype} · Inbox`
                    : 'Inbox'}
                </p>
                <p className='text-label-lg font-medium text-text-strong-950 truncate mt-0.5'>
                  {item?.primaryText ?? 'Notification'}
                </p>
              </button>
            ) : (
              <div className='min-w-0 flex-1'>
                <p className='paragraph-small text-text-sub-500'>
                  {sourceDoctype
                    ? `${sourceDoctype === 'HD Ticket' ? 'Tickets' : sourceDoctype} · Inbox`
                    : 'Inbox'}
                </p>
                <h1 className='text-label-lg font-medium text-text-strong-950 truncate mt-0.5'>
                  {item?.primaryText ?? 'Notification'}
                </h1>
              </div>
            )}
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  className='size-9 rounded-lg p-0'
                  onClick={handleMarkAsReadClick}
                >
                  {markAsRead ? (
                    <RiMailUnreadLine size={20} className='text-text-sub-600' />
                  ) : (
                    <RiMailOpenLine size={20} className='text-text-sub-600' />
                  )}
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content size='small' variant='dark'>
                <p>{markAsRead ? 'Mark as unread' : 'Mark as read'}</p>
              </Tooltip.Content>
            </Tooltip.Root>
            <InboxSnoozePopover
              onSnooze={handleSnooze}
              onUnsnooze={handleUnsnooze}
              isSnoozed={isSnoozed}
              triggerClassName='size-9 rounded-lg p-0'
            />
            {isCleared ? (
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1.5'
                onClick={handleUnclear}
              >
                <RiCheckDoubleLine size={18} />
                Unclear
              </Button.Root>
            ) : (
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1.5'
                onClick={handleClear}
              >
                <RiCheckDoubleLine size={18} />
                Clear
              </Button.Root>
            )}
          </div>
        </header>

        <div className='flex flex-1 min-h-0 bg-bg-white-0'>
          {/* Left nav chevrons – Figma: narrow strip, faint border, two stacked rounded buttons with border + shadow */}
          <aside className='flex w-12 shrink-0 flex-col items-center border-r border-stroke-soft-200 bg-bg-weak-100 p-4'>
            <button
              type='button'
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className='flex size-8 items-center justify-center rounded-t-lg border border-b-0 border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 shadow-regular-xs transition-colors hover:border-stroke-soft-300 hover:bg-bg-weak-50 hover:text-text-strong-950 disabled:pointer-events-none disabled:opacity-50'
              aria-label='Previous notification'
            >
              <RiArrowUpSLine size={20} />
            </button>
            <button
              type='button'
              onClick={handleNext}
              disabled={!hasNext}
              className='flex size-8 items-center justify-center rounded-b-lg border border-t-0 border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 shadow-regular-xs transition-colors hover:border-stroke-soft-300 hover:bg-bg-weak-50 hover:text-text-strong-950 disabled:pointer-events-none disabled:opacity-50'
              aria-label='Next notification'
            >
              <RiArrowDownSLine size={20} />
            </button>
          </aside>

          {/* Main content: timeline with reply */}
          <main className='flex-1 flex min-w-0 flex-col min-h-0 bg-bg-white-0'>
            <InboxTimelineWithReply
              notificationId={item.id}
              comments={comments}
              history={history}
              loading={false}
              onAddComment={handleAddComment}
              emptyStateTitle='There are no updates here yet.'
              collapsedItemCount={3}
            />
          </main>
        </div>

        {canOpenDetailDrawer && (
          <MyTaskDetailDrawers
            selectedRow={detailDrawerOpen ? effectiveDrawerRow : null}
            onClose={() => setDetailDrawerOpen(false)}
            onTasksRefresh={refreshNotificationDetail}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default InboxNotificationDetailPage;
