import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ImagePreview from '@/components/ui/image-preview';
import * as Modal from '@/components/ui/modal';
import * as Badge from '@/components/ui/badge';
import * as CalendarPrimitives from '@/components/ui/calendar';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import {
  RiBuildingLine,
  RiCalendarCheckLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiHeartPulseLine,
  RiImageLine,
  RiUserLine,
  RiMessage2Line,
} from 'react-icons/ri';
import UserProfileSvg from '../ui/team-user-profile-svg';
import { cn } from '@/utils/cn';
import { format, parseISO, addDays } from 'date-fns';
import UserAbsentSvg from '../ui/user-absent-svg';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTeamMemberDetail,
  updateHygieneInspectionDetailAccurateBy,
} from '@/redux/teamManagementSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const isEditableKeyboardTarget = (el) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.closest('[contenteditable="true"]')) return true;
  return Boolean(el.closest('input, textarea, select'));
};

/** Let month/year (Radix) selects keep ArrowUp/Down navigation when the listbox is open. */
const isInsideOpenSelectList = (el) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[role="listbox"]')) return true;
  if (el.getAttribute('role') === 'option') return true;
  return false;
};

/** Normalize Pass/Fail for comparison (hygiene row manual vs AI). */
const normalizeInspectionStatus = (value) => {
  const t = String(value ?? '')
    .trim()
    .toLowerCase();
  if (t === 'pass') return 'pass';
  if (t === 'fail') return 'fail';
  return t;
};

/** True when both manual and AI status exist and they disagree (no badge/dropdown if AI is missing). */
const hasInspectionMismatch = (item) => {
  const manual = normalizeInspectionStatus(item?.status);
  const aiRaw = item?.ai_status;
  if (!manual) return false;
  if (aiRaw == null || !String(aiRaw).trim()) return false;
  const ai = normalizeInspectionStatus(aiRaw);
  return manual !== ai;
};

const EmptyState = () => {
  return (
    <div className='w-[500px] pb-3 flex-col flex items-center justify-center'>
      <UserAbsentSvg />
      <span className='text-[var(--color-text-sub-500)] paragraph-small'>
        The staff member was on leave on this date.
      </span>
    </div>
  );
};
const AiStatusBadge = ({ aiStatus, className, ...rest }) => {
  if (!aiStatus || !aiStatus.trim()) return null;

  const normalized = aiStatus.trim().toLowerCase();

  const label = normalized === 'pass' ? 'Pass' : normalized === 'fail' ? 'Fail' : 'Not Visible';

  const textColorClass =
    normalized === 'pass'
      ? 'text-success-base'
      : normalized === 'fail'
        ? 'text-red-500'
        : 'text-orange-500';

  return (
    <div
      className={cn('btn-ai-gradient ml-auto shrink-0 rounded-md !h-auto p-[1px]', className)}
      style={{ minWidth: '80px' }}
      {...rest}
    >
      <div className='rounded-[5px] bg-white px-[8px] py-[3px] flex items-center justify-center w-full'>
        <span className={`text-label-xs font-medium whitespace-nowrap ${textColorClass}`}>
          {label}
        </span>
      </div>
    </div>
  );
};

const RESOLUTION_AI = 'ai';
const RESOLUTION_HUMAN = 'human';

/** Map API `custom_accurate_by` to popover resolution for pre-selection. */
const resolutionFromCustomAccurateBy = (item) => {
  const raw = String(item?.custom_accurate_by ?? '').trim();
  if (!raw) return undefined;
  const u = raw.toLowerCase();
  if (u === 'ai') return RESOLUTION_AI;
  if (u === 'human') return RESOLUTION_HUMAN;
  return undefined;
};

const HygieneMismatchResolutionPopover = ({
  item,
  rowKey,
  resolution,
  isSaving,
  onResolutionChange,
}) => {
  const mismatch = hasInspectionMismatch(item);
  const [open, setOpen] = useState(false);

  const handlePick = useCallback(
    async (value) => {
      const ok = await onResolutionChange(item, rowKey, value);
      if (ok) setOpen(false);
    },
    [item, onResolutionChange, rowKey],
  );

  if (!mismatch) {
    return <AiStatusBadge aiStatus={item.ai_status} />;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Tooltip.Root delayDuration={300}>
        <Popover.Trigger asChild>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              className='ml-auto shrink-0 cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1'
              aria-label='Resolve AI vs manual hygiene mismatch'
            >
              <AiStatusBadge aiStatus={item.ai_status} className='pointer-events-none' />
            </button>
          </Tooltip.Trigger>
        </Popover.Trigger>
        <Tooltip.Content side='top' sideOffset={6} className='z-[220] max-w-[200px]'>
          Click to review
        </Tooltip.Content>
      </Tooltip.Root>
      <Popover.Content
        side='right'
        align='start'
        sideOffset={8}
        showArrow={false}
        className='z-[200] w-[min(260px,calc(100vw-24px))] p-2'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='flex flex-col gap-0.5'>
          <span className='text-label-xs text-text-sub-600 px-1.5 py-1'>
            Which result is correct?
          </span>
          <button
            type='button'
            disabled={isSaving}
            onClick={() => handlePick(RESOLUTION_AI)}
            className={cn(
              'paragraph-small w-full rounded-lg px-3 py-2 text-left transition-colors',
              resolution === RESOLUTION_AI
                ? 'bg-primary-lighter text-text-strong-950'
                : 'text-text-strong-950 hover:bg-bg-weak-50',
              isSaving && 'pointer-events-none opacity-50',
            )}
          >
            AI is correct
          </button>
          <button
            type='button'
            disabled={isSaving}
            onClick={() => handlePick(RESOLUTION_HUMAN)}
            className={cn(
              'paragraph-small w-full rounded-lg px-3 py-2 text-left transition-colors',
              resolution === RESOLUTION_HUMAN
                ? 'bg-primary-lighter text-text-strong-950'
                : 'text-text-strong-950 hover:bg-bg-weak-50',
              isSaving && 'pointer-events-none opacity-50',
            )}
          >
            Human is correct
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
const LeftCard = ({
  selectedDate,
  onDateSelect,
  teamMemberDetail,
  selectedDateFromApi,
  onMonthChange: onMonthChangeFromParent,
}) => {
  const [month, setMonth] = useState(new Date());

  const empDetail = teamMemberDetail?.employee;

  // When API provides selected_date_details, open calendar on that month
  useEffect(() => {
    if (selectedDateFromApi) {
      setMonth(selectedDateFromApi);
    }
  }, [selectedDateFromApi]);

  const apiDateModifier = selectedDateFromApi ? [selectedDateFromApi] : [];

  // Build date arrays from API attendance: green for Pass, orange for Fail
  const attendanceFromApi = teamMemberDetail?.attendance ?? [];
  const hygienePassDates = [];
  const hygieneFailDates = [];
  const absentDates = [];

  // console.log('attendanceFromApi', attendanceFromApi);
  attendanceFromApi.forEach((item) => {
    if (!item?.date) return;
    try {
      const d = parseISO(item.date);
      const status = (item.hygiene_status ?? '').toLowerCase();
      if (status == 'pass') {
        if (item?.attendance_status === 'Absent') {
          absentDates.push(d);
        } else {
          hygienePassDates.push(d);
        }
      } else hygieneFailDates.push(d);
    } catch {
      // skip invalid date
    }
  });

  return (
    <div className='w-[350px] pb-5 border-r border-r-stroke-soft-200 flex flex-col items-center justify-start gap-4'>
      <div className='w-full h-[100px] relative bg-[linear-gradient(245deg,_#E6F4EE_56.68%,_#0B7749_202.46%)] rounded-t-xl rounded-r-none'>
        <div className='absolute ring-3  ring-white rounded-full ring- -bottom-8 left-5'>
          <img
            src={
              empDetail?.image ||
              'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png'
            }
            alt={empDetail?.name}
            className='object-cover w-18 h-18 rounded-full'
          />
        </div>
      </div>

      {/*name and email */}
      <div className='w-full mt-8 px-5 flex flex-col items-start justify-start'>
        <div className='w-full flex items-center justify-between'>
          <span className='label-medium text-[var(--color-text-main-900)]'>{empDetail?.name}</span>
          <Badge.Root variant='light' color={empDetail?.status === 'Active' ? 'green' : 'red'}>
            {empDetail?.status}
          </Badge.Root>
        </div>

        <span className='paragraph-small text-[var(--color-text-sub-500)]'>{empDetail?.email}</span>
      </div>

      {/*center and role */}

      <div className='w-full px-5'>
        <div className='w-full  flex border-1 border-stroke-soft-200 rounded-xl flex-col bg-[var(--color-bg-weak-100)] items-start justify-start '>
          <div className='w-full px-3  border-b border-b-stroke-soft-200 py-2 flex items-center justify-between'>
            <span className='text-[var(--color-text-sub-500)] label-small w-1/2 flex items-center gap-[6px]'>
              <RiBuildingLine className='size-4' /> Center
            </span>
            <span className='label-small text-[var(--color-text-main-900] w-1/2'>
              {empDetail?.center}
              {/* {empDetail?}<span className='text-[var(--color-text-soft-400)] label-xsmall'> (AMD)</span> */}
            </span>
          </div>

          <div className='w-full px-3 py-2 flex items-center justify-between'>
            <span className='text-[var(--color-text-sub-500)] w-1/2 label-small flex items-center gap-[6px]'>
              <RiUserLine className='size-4' /> Role
            </span>
            <span className='w-1/2'>
              <Badge.Root variant='light' color='blue' className='w'>
                {empDetail?.role}
              </Badge.Root>
            </span>
          </div>
        </div>
      </div>

      <div className='w-full px-5 flex flex-col items-center justify-center gap-3'>
        <span className='w-full text-[var(--color-text-sub-500)] flex items-center gap-2'>
          <RiCalendarCheckLine />
          Attendance
        </span>

        <div className='w-full border-1 border-stroke-soft-200 rounded-xl flex justify-center'>
          <CalendarPrimitives.Calendar
            mode='single'
            selected={selectedDate}
            onSelect={onDateSelect}
            required
            month={month}
            onMonthChange={(date) => {
              setMonth(date);
              onMonthChangeFromParent?.(date);
            }}
            classNames={{
              day: cn(
                // base
                'flex size-9 shrink-0 items-center justify-center rounded-full text-center text-label-sm text-text-sub-600 outline-none relative z-1',
                'transition duration-200 ease-out',
                // hover
                'hover:bg-bg-weak-50 hover:text-text-strong-950',
                // selected
                'aria-[selected]:bg-primary-base aria-[selected]:text-static-white',
                // focus visible
                'focus:outline-none focus-visible:bg-bg-weak-50 focus-visible:text-text-strong-950',
              ),
            }}
            modifiers={{
              hygienePass: hygienePassDates,
              hygieneFail: hygieneFailDates,
              selectedDateFromApi: apiDateModifier,
              absent: absentDates,
            }}
            modifiersClassNames={{
              hygienePass: 'bg-success-base text-white hover:!bg-success-base hover:!text-white',
              hygieneFail: 'bg-orange-500 text-white hover:!bg-orange-500 hover:!text-white',
              selectedDateFromApi: '!bg-blue-500 text-white hover:!bg-blue-500 hover:!text-white',
              absent: 'bg-red-500 text-white hover:!bg-red-500 hover:!text-white',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const getInspectionRowKey = (item, index) =>
  item?.check_item_id ??
  item?.id ??
  item?.check_item ??
  item?.title ??
  item?.name ??
  `row-${index}`;

const RightCard = ({
  selectedDate,
  selectedDateDetails,
  hygieneInspection = [],
  isHygienePresent,
  refetchCurrentDetail,
}) => {
  const dispatch = useDispatch();
  const [mismatchResolutions, setMismatchResolutions] = useState({});
  const [savingRowKey, setSavingRowKey] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const detailDateKey = selectedDateDetails?.date ?? '';

  useEffect(() => {
    setMismatchResolutions({});
  }, [detailDateKey]);

  const handleResolutionChange = useCallback(
    async (item, rowKey, value) => {
      const docName = item?.name ?? item?.id;
      if (docName == null || String(docName).trim() === '') {
        showErrorToast(new Error('Missing row id'), {
          defaultMessage: 'Could not save: missing inspection row id.',
        });
        return false;
      }
      const custom_accurate_by = value === RESOLUTION_AI ? 'AI' : 'Human';
      setSavingRowKey(rowKey);
      try {
        await dispatch(
          updateHygieneInspectionDetailAccurateBy({ name: docName, custom_accurate_by }),
        ).unwrap();
        setMismatchResolutions((prev) => ({ ...prev, [rowKey]: value }));
        showSuccessToast('Review Updated');
        refetchCurrentDetail?.();
        return true;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not save review.' });
        return false;
      } finally {
        setSavingRowKey(null);
      }
    },
    [dispatch, refetchCurrentDetail],
  );

  const dateLabel = selectedDate
    ? format(selectedDate, 'do MMM yyyy')
    : selectedDateDetails?.date
      ? format(parseISO(selectedDateDetails.date), 'do MMM yyyy')
      : '—';

  const isLoading = useSelector((state) => state.teamManagement.teamMemberDetail.isLoading);
  const hasStatus = selectedDateDetails?.status != null && selectedDateDetails?.status !== '';
  const hasHygieneStatus =
    selectedDateDetails?.hygiene_status != null && selectedDateDetails?.hygiene_status !== '';

  const inspectionList = Array.isArray(hygieneInspection) ? hygieneInspection : [];
  const photos = Array.isArray(selectedDateDetails?.photos) ? selectedDateDetails.photos : [];

  const { lightboxImages, photoLightboxIndexByPhotoIndex } = useMemo(() => {
    const images = [];
    const indexByPhotoIndex = [];
    photos.forEach((photo, ind) => {
      const src = typeof photo === 'string' ? photo : photo?.photo_url;
      if (!src) {
        indexByPhotoIndex[ind] = -1;
        return;
      }
      indexByPhotoIndex[ind] = images.length;
      const alt =
        typeof photo === 'object' ? (photo?.alt ?? `Photo ${ind + 1}`) : `Photo ${ind + 1}`;
      images.push({ src, alt, caption: alt });
    });
    return { lightboxImages: images, photoLightboxIndexByPhotoIndex: indexByPhotoIndex };
  }, [photos]);

  const hasComment =
    selectedDateDetails?.comment != null && String(selectedDateDetails.comment).trim() !== '';
  const message = selectedDateDetails?.message;

  if (!isHygienePresent) {
    return (
      <div className='w-[500px] pb-3 flex-col flex items-center justify-center'>
        <UserAbsentSvg />
        <span className='text-[var(--color-text-sub-500)] paragraph-small'>
          No attendance record found for this date
        </span>
      </div>
    );
  }

  return (
    <div className='w-[500px] pb-3'>
      <ImagePreview
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
      {isLoading && <div>Loading...</div>}

      <div className='w-full border-b border-b-stroke-soft-200 px-5 py-4 text-[var(--color-text-main-900)] label-small'>
        {dateLabel}
      </div>

      {inspectionList.length > 0 && (
        <div className='w-full pt-5 gap-2 px-5 flex flex-col items-start'>
          <span className='text-[var(--color-text-sub-500)] flex items-center gap-1 label-medium'>
            <RiHeartPulseLine size={20} /> Hygiene Inspection
          </span>
          {inspectionList.map((item, ind) => {
            const rowKey = getInspectionRowKey(item, ind);
            return (
              <span
                key={rowKey}
                className={cn(
                  'w-full p-[6px] gap-2 paragraph-small rounded-md flex text-[var(--color-text-main-900)] items-center',
                  item.status === 'Pass' ? 'bg-success-lighter' : 'bg-warning-lighter',
                )}
              >
                {item.status === 'Pass' ? (
                  <RiCheckLine size={15} className='text-success-base' />
                ) : (
                  <RiErrorWarningLine size={15} className='text-warning-base' />
                )}
                <span className='flex-1'>{item.title ?? item.name ?? item?.check_item ?? '—'}</span>

                <HygieneMismatchResolutionPopover
                  item={item}
                  rowKey={rowKey}
                  resolution={mismatchResolutions[rowKey] ?? resolutionFromCustomAccurateBy(item)}
                  isSaving={savingRowKey === rowKey}
                  onResolutionChange={handleResolutionChange}
                />
              </span>
            );
          })}
        </div>
      )}

      <div className='w-full flex flex-col items-start gap-2 px-5 pt-5'>
        {photos.length > 0 && (
          <span className='text-[var(--color-text-sub-500)] flex items-center gap-1 label-medium'>
            <RiImageLine size={20} /> Today&apos;s Photos
          </span>
        )}
        <div className='w-full flex gap-2 justify-start items-start flex-wrap'>
          {photos?.length > 0 &&
            photos?.map((photo, ind) => {
              const src = typeof photo === 'string' ? photo : photo?.photo_url;
              const lightboxIdx = photoLightboxIndexByPhotoIndex[ind];
              const canPreview = src && lightboxIdx >= 0;

              return (
                <div
                  key={ind}
                  className='w-[76px] h-[76px] rounded-lg overflow-hidden bg-[var(--color-bg-weak-100)] shrink-0'
                >
                  {canPreview ? (
                    <button
                      type='button'
                      className='w-full h-full cursor-zoom-in focus:outline-none'
                      onClick={() => {
                        setLightboxIndex(lightboxIdx);
                        setLightboxOpen(true);
                      }}
                      aria-label='View full image'
                    >
                      <img
                        src={src}
                        alt={
                          typeof photo === 'object'
                            ? (photo?.alt ?? `Photo ${ind + 1}`)
                            : `Photo ${ind + 1}`
                        }
                        className='w-full h-full object-cover'
                      />
                    </button>
                  ) : (
                    <div className='w-full h-full flex items-center justify-center'>
                      <RiImageLine className='text-[var(--color-text-soft-400)]' size={20} />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {hasComment && (
        <div className='w-full pt-5 gap-2 flex flex-col items-start px-5'>
          <span className='flex items-center gap-1 label-medium text-[var(--color-text-sub-500)]'>
            <RiMessage2Line size={20} /> Comment
          </span>
          <span className='w-full flex px-3 my-1 py-2 bg-[var(--color-bg-weak-100)] paragraph-small text-[var(--color-text-main-900)] rounded-md'>
            {selectedDateDetails.comment}
          </span>
        </div>
      )}

      {!message &&
        !hasStatus &&
        !hasHygieneStatus &&
        inspectionList.length === 0 &&
        photos.length === 0 &&
        !hasComment && (
          <div className='w-full px-5 py-4'>
            <span className='paragraph-small text-[var(--color-text-soft-400)]'>
              No details for this date.
            </span>
          </div>
        )}
    </div>
  );
};

const TeamUserDetailModal = ({ isOpen, onOpenChange, member }) => {
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const { data: teamMemberDetail, isLoading: teamMemberDetailLoading } = useSelector(
    (state) => state.teamManagement.teamMemberDetail,
  );

  const employeeId = member?.employee_id ?? teamMemberDetail?.employee?.employee_id;

  // console.log('teamMemberDetail', teamMemberDetail);

  const isHygienePresent = teamMemberDetail?.selected_date_details?.hygiene_inspection?.length > 0;

  // When API returns selected_date_details, use that date as default and highlight it in blue
  const selectedDateFromApi =
    teamMemberDetail?.selected_date_details?.date != null
      ? (() => {
          try {
            return parseISO(teamMemberDetail.selected_date_details.date);
          } catch {
            return null;
          }
        })()
      : null;

  useEffect(() => {
    if (isOpen && selectedDateFromApi) {
      setSelectedDate(selectedDateFromApi);
    }
  }, [isOpen, selectedDateFromApi?.getTime()]);

  // Show API details only when selected date matches selected_date_details.date (from fetched API response)
  const selectedDateDetails =
    teamMemberDetail?.selected_date_details?.date && selectedDate
      ? format(selectedDate, 'yyyy-MM-dd') === teamMemberDetail.selected_date_details.date
        ? teamMemberDetail.selected_date_details
        : null
      : (teamMemberDetail?.selected_date_details ?? null);

  // Extract hygiene_inspection from the fetched API response for the right card
  const hygieneInspection = Array.isArray(selectedDateDetails?.hygiene_inspection)
    ? selectedDateDetails.hygiene_inspection
    : [];

  // API indicates member was absent/on leave for this date (from selected_date_details or attendance)
  const isAbsentFromApi =
    selectedDateDetails?.status != null &&
    String(selectedDateDetails.status).toLowerCase() === 'absent';

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    if (employeeId) {
      dispatch(
        fetchTeamMemberDetail({
          employee_id: employeeId,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          selected_date: format(date, 'yyyy-MM-dd'),
        }),
      );
    }
  };

  // When user navigates to another month/year in the calendar, fetch that month's data
  const handleMonthChange = (monthDate) => {
    if (!monthDate || !employeeId) return;
    const monthNumber = monthDate.getMonth() + 1;
    const year = monthDate.getFullYear();
    const selectedDateString = format(monthDate, 'yyyy-MM-dd');
    setSelectedDate(monthDate);
    dispatch(
      fetchTeamMemberDetail({
        employee_id: employeeId,
        month: monthNumber,
        year,
        selected_date: selectedDateString,
      }),
    );
  };

  // Arrow Left / Right: previous or next day (same as picking adjacent date on the calendar)
  useEffect(() => {
    if (!isOpen || !employeeId) return undefined;

    const onKeyDown = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isEditableKeyboardTarget(e.target)) return;
      if (isInsideOpenSelectList(e.target)) return;

      e.preventDefault();
      e.stopPropagation();
      const base = selectedDateRef.current ?? new Date();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = addDays(base, delta);
      setSelectedDate(next);
      dispatch(
        fetchTeamMemberDetail({
          employee_id: employeeId,
          month: next.getMonth() + 1,
          year: next.getFullYear(),
          selected_date: format(next, 'yyyy-MM-dd'),
        }),
      );
    };

    // Capture phase runs before react-day-picker, so ←/→ still change the selected day after a calendar click
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, employeeId, dispatch]);

  const refetchCurrentDetail = useCallback(() => {
    if (!employeeId || !selectedDate) return;
    dispatch(
      fetchTeamMemberDetail({
        employee_id: employeeId,
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear(),
        selected_date: format(selectedDate, 'yyyy-MM-dd'),
      }),
    );
  }, [dispatch, employeeId, selectedDate]);

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-h-fit max-w-[850px]'>
        <div className='w-full flex '>
          <LeftCard
            teamMemberDetail={teamMemberDetail}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            selectedDateFromApi={selectedDateFromApi}
            onMonthChange={handleMonthChange}
          />

          {isAbsentFromApi ? (
            <EmptyState />
          ) : teamMemberDetailLoading ? (
            <div className='w-[500px] pb-3 flex items-center justify-center min-h-[200px]'>
              Loading...
            </div>
          ) : (
            <RightCard
              isHygienePresent={isHygienePresent}
              selectedDate={selectedDate}
              selectedDateDetails={selectedDateDetails}
              hygieneInspection={hygieneInspection}
              refetchCurrentDetail={refetchCurrentDetail}
            />
          )}
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default TeamUserDetailModal;
