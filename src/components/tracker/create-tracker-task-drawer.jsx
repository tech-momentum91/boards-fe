import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiAttachment2,
  RiCalendarLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiFileList2Line,
  RiLayoutMasonryLine,
  RiStackLine,
  RiStickyNoteLine,
  RiTimeLine,
  RiUploadCloud2Line,
  RiUploadLine,
  RiUserLine,
  RiErrorWarningFill,
} from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Tag from '@/components/ui/tag';
import * as CompactButton from '@/components/ui/compact-button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Switch from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import ErrorText from '@/components/ui/error-text';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import AttachmentList from '@/components/ui/attachment-list';
import FieldRow from '@/components/ui/field-row';
import * as Popover from '@/components/ui/popover';
import { useDispatch, useSelector } from 'react-redux';
import { clearTaskDetail, fetchTaskDetailThunk } from '@/redux/settingsTrackerSlice';
import apiClient from '@/api';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { normalizeTrackerDisplayName } from '@/utils/tracker-name-utils';
import { buildCenterTrackerTaskPayload } from '@/utils/center-tracker-task-payload';
import {
  fetchAssociatedTeamMembersForRolesThunk,
  fetchFloorByCenterThunk,
  fetchTrackerTaskMasterDetailThunk,
  fetchTrackerTaskMasterListThunk,
} from '@/redux/centerTrackerSlice';
import { cn } from '@/utils/cn';
import { MultiSelect } from '@/components/ui/multi-select';
import SupervisorAssigneeMultiSelect from '@/components/ui/supervisor-assignee-multi-select';
import SupportRolesSelect from '@/components/tracker/support-roles-select';
import TicketCreateLayoutPanel from '@/components/ticket-management/ticket-create-layout-panel';
import TrackerCenterViewLayoutPanel from '@/components/tracker/tracker-center-view-layout-panel';
import {
  fetchCenterTrackerLayoutBundle,
  findCenterTrackerLayoutBundleFloor,
  resolveCenterTrackerLayoutFloorForSelection,
} from '@/api/centerTrackerLayout';

/** Weekday ids for API `schedule[].frequency` (1 = Monday … 7 = Sunday) */
const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

/** Month week index for API `schedule[].frequency` (1 = Week 1 … 5 = Week 5) */
const MONTH_WEEK_OPTIONS = Array.from({ length: 4 }, (_, index) => ({
  value: String(index + 1),
  label: `Week ${index + 1}`,
}));

/** Monthly start_day / end_day: day index inside selected week (1..7). */
const MONTH_DAY_NUMERIC_OPTIONS = [
  { value: '1', label: '1st day' },
  { value: '2', label: '2nd day' },
  { value: '3', label: '3rd day' },
  { value: '4', label: '4th day' },
  { value: '5', label: '5th day' },
  { value: '6', label: '6th day' },
  { value: '7', label: '7th day' },
];

/** Radix Select cannot use `value=""`; optional end uses sentinel in the menu only (form stores `''`). */
const MONTH_END_DAY_NONE = '__monthly_end_none__';

/** Radix Select: use `undefined` when empty so trigger shows placeholder, not a fake "None" selection. */
const toSelectStringValue = (raw) => {
  const s = String(raw ?? '').trim();
  return s ? s : undefined;
};

/** Use a leap year so February allows 29 in day pickers. */
const YEAR_MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const normalizeTimeForPicker = (timeValue) => {
  const s = String(timeValue ?? '').trim();
  if (!s) return '';
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return '';
};

const ScheduleTimeSelect = ({ value, onChange, placeholder, itemKeyPrefix, options }) => (
  <Select.Root
    size='small'
    value={normalizeTimeForPicker(value) || undefined}
    onValueChange={onChange}
  >
    <Select.Trigger className='min-w-0 flex-1'>
      <Select.Value placeholder={placeholder} />
    </Select.Trigger>
    <Select.Content>
      {(options ?? []).map((opt) => (
        <Select.Item key={`${itemKeyPrefix}-${opt.value}`} value={opt.value}>
          {opt.label}
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Root>
);

/** Seconds since midnight for valid HH:MM:SS after `normalizeTimeForPicker`; else null. */
const comparablePickerTimeSeconds = (raw) => {
  const s = normalizeTimeForPicker(raw);
  if (!s || !/^\d{2}:\d{2}:\d{2}$/.test(s)) return null;
  const [h, m, sec] = s.split(':').map(Number);
  return h * 3600 + m * 60 + sec;
};

/** Tracker Task Master list/detail: assignees like [{ assignee_type: "Role", assignee: "Supervisor" }] */
const assigneeRoleFromTrackerSettingsAssignees = (raw) => {
  if (!raw) return '';
  let list = raw;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return String(list).trim();
    }
  }
  if (!Array.isArray(list)) return '';
  const first = list.find(
    (entry) =>
      String(entry?.assignee_type ?? '').toLowerCase() === 'role' &&
      String(entry?.assignee ?? '').trim(),
  );
  return String(first?.assignee ?? '').trim();
};

const normalizeChecklistFromApi = (checklists) => {
  if (!Array.isArray(checklists) || checklists.length === 0) {
    return [{ checklist_title: '', disabled: 0 }];
  }

  const rows = [...checklists]
    .sort((a, b) => (Number(a?.idx) || 0) - (Number(b?.idx) || 0))
    .map((row) => {
      if (typeof row === 'string') {
        return { checklist_title: row, disabled: 0 };
      }
      return {
        name: row?.name,
        checklist_title: row?.checklist_title ?? row?.checklist ?? '',
        disabled: Number(row?.disabled) ? 1 : 0,
      };
    })
    .map((row) => ({
      ...row,
      checklist_title: String(row?.checklist_title ?? '').trim(),
    }))
    .filter((row) => row.checklist_title.length > 0 || row.name);

  return rows.length > 0 ? rows : [{ checklist_title: '', disabled: 0 }];
};

/** Center tracker task + tracker settings: at least one checklist row with a title (or saved `name`). */
const requiredChecklistsArraySchema = z
  .array(
    z.object({
      name: z.string().optional(),
      checklist_title: z.string().optional(),
      disabled: z.number().optional(),
    }),
  )
  .min(1, 'Add at least one checklist item')
  .refine(
    (items) =>
      items.some(
        (c) =>
          String(c?.checklist_title ?? '').trim().length > 0 ||
          String(c?.name ?? '').trim().length > 0,
      ),
    { message: 'Enter at least one checklist item with a title' },
  );

const trackerTaskSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  floor: z.string().min(1, 'Floor is required'),
  assignee: z.string().optional(),
  frequency: z.string().min(1, 'Frequency is required'),
  startTime: z.string().optional(),
  description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
  checklists: requiredChecklistsArraySchema,
});

const trackerSettingsSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  assigneeRole: z.string().min(1, 'Role is required'),
  description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
  checklists: requiredChecklistsArraySchema,
});

/** Center Tracker Task — Daily: N schedule rows from frequency count */
const trackerCenterDailySchema = z
  .object({
    taskTitle: z.string().min(1, 'Task title is required'),
    floor: z.string().min(1, 'Select a floor'),
    assigneeIds: z.array(z.string()).optional(),
    assigneeRoleName: z.string().optional(),
    trackerTaskMasterTemplate: z.string().optional(),
    masterTaskName: z.string().optional(),
    frequencyCount: z
      .string()
      .min(1, 'Frequency is required')
      .refine((v) => {
        const n = Number.parseInt(String(v), 10);
        return Number.isFinite(n) && n >= 1 && n <= 48;
      }, 'Select frequency between 1 and 48'),
    schedule: z.array(
      z.object({
        start_time: z.string().optional(),
        end_time: z.string().optional(),
      }),
    ),
    description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
    isImageMandatory: z.boolean().optional(),
    checklists: requiredChecklistsArraySchema,
  })
  .superRefine((data, context) => {
    const n = Number.parseInt(data.frequencyCount, 10);
    if (!Number.isFinite(n) || data.schedule.length !== n) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schedule'],
        message: `Provide exactly ${n} start/end row(s) to match frequency`,
      });
      return;
    }
    const hasMissingTimes = data.schedule.some(
      (row) => !String(row?.start_time ?? '').trim() || !String(row?.end_time ?? '').trim(),
    );
    if (hasMissingTimes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schedule'],
        message: 'Start and end time are required for each frequency slot',
      });
      return;
    }
    data.schedule.forEach((row, i) => {
      const a = comparablePickerTimeSeconds(row?.start_time);
      const b = comparablePickerTimeSeconds(row?.end_time);
      if (a == null || b == null) return;
      if (a === b) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['schedule', i, 'end_time'],
          message:
            'End time cannot match start time. Use different times, or an overnight range (end earlier than start on the clock).',
        });
      }
    });
  });

/** Center Tracker Task — Weekly: multiselect weekdays (frequency 1–7), one time row per day */
const trackerCenterWeeklySchema = z
  .object({
    taskTitle: z.string().min(1, 'Task title is required'),
    floor: z.string().min(1, 'Select a floor'),
    assigneeIds: z.array(z.string()).optional(),
    assigneeRoleName: z.string().optional(),
    trackerTaskMasterTemplate: z.string().optional(),
    masterTaskName: z.string().optional(),
    weekdayIds: z.array(z.string()).min(1, 'Select at least one day'),
    schedule: z.array(
      z.object({
        start_time: z.string().optional(),
        end_time: z.string().optional(),
      }),
    ),
    description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
    isImageMandatory: z.boolean().optional(),
    checklists: requiredChecklistsArraySchema,
  })
  .superRefine((data, context) => {
    const n = data.weekdayIds.length;
    if (!Number.isFinite(n) || data.schedule.length !== n) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schedule'],
        message: `Provide exactly ${n} start/end row(s) for the selected days`,
      });
      return;
    }
    data.schedule.forEach((row, i) => {
      const endStr = String(row?.end_time ?? '').trim();
      if (!endStr) return;
      const a = comparablePickerTimeSeconds(row?.start_time);
      const b = comparablePickerTimeSeconds(row?.end_time);
      if (a == null || b == null) return;
      if (b <= a) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['schedule', i, 'end_time'],
          message:
            'End time must be after start time on the same calendar day. Overnight ranges are only allowed for daily tasks.',
        });
      }
    });
  });

/** Center Tracker Task — Monthly: multiselect weeks 1–5; one start/end day row per week (aligned w/ Weekly UX) */
const trackerCenterMonthlySchema = z
  .object({
    taskTitle: z.string().min(1, 'Task title is required'),
    floor: z.string().min(1, 'Select a floor'),
    assigneeIds: z.array(z.string()).optional(),
    assigneeRoleName: z.string().optional(),
    trackerTaskMasterTemplate: z.string().optional(),
    masterTaskName: z.string().optional(),
    monthWeekIds: z.array(z.enum(['1', '2', '3', '4', '5'])).min(1, 'Select at least one week'),
    schedule: z.array(
      z.object({
        start_day: z
          .string()
          .optional()
          .refine((v) => !v || /^[1-7]$/.test(String(v)), 'Date must be 1–7'),
        end_day: z
          .string()
          .refine(
            (v) => v === '' || v == null || /^[1-7]$/.test(String(v)),
            'End date must be 1–7 or empty',
          ),
      }),
    ),
    description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
    isImageMandatory: z.boolean().optional(),
    checklists: requiredChecklistsArraySchema,
  })
  .superRefine((data, context) => {
    const n = data.monthWeekIds.length;
    if (data.schedule.length !== n) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schedule'],
        message: `Provide exactly ${n} start/end day row(s) for the selected weeks`,
      });
      return;
    }
    data.schedule.forEach((row, i) => {
      const sStr = String(row?.start_day ?? '').trim();
      const eStr = String(row?.end_day ?? '').trim();
      if (!sStr || !eStr || !/^[1-7]$/.test(sStr) || !/^[1-7]$/.test(eStr)) return;
      const s = Number.parseInt(sStr, 10);
      const e = Number.parseInt(eStr, 10);
      if (e < s) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['schedule', i, 'end_day'],
          message: 'End date cannot be before start date.',
        });
      }
    });
  });

/** Annually: multiselect months only (API frequency 1–12). Days are not required. */
const trackerCenterAnnuallySchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  floor: z.string().min(1, 'Select a floor'),
  assigneeIds: z.array(z.string()).optional(),
  assigneeRoleName: z.string().optional(),
  trackerTaskMasterTemplate: z.string().optional(),
  masterTaskName: z.string().optional(),
  yearMonthIds: z
    .array(z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']))
    .min(1, 'Select at least one month'),
  schedule: z
    .array(
      z.object({
        start_day: z.string().optional(),
        end_day: z.string().optional(),
      }),
    )
    .optional(),
  description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
  isImageMandatory: z.boolean().optional(),
  checklists: requiredChecklistsArraySchema,
});

const trackerCenterNonDailySchema = z
  .object({
    taskTitle: z.string().min(1, 'Task title is required'),
    floor: z.string().min(1, 'Select a floor'),
    assigneeIds: z.array(z.string()).optional(),
    assigneeRoleName: z.string().optional(),
    trackerTaskMasterTemplate: z.string().optional(),
    masterTaskName: z.string().optional(),
    frequency: z.string().min(1, 'Frequency is required'),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
    isImageMandatory: z.boolean().optional(),
    checklists: requiredChecklistsArraySchema,
  })
  .superRefine((data, context) => {
    const endStr = String(data.endTime ?? '').trim();
    if (!endStr) return;
    const a = comparablePickerTimeSeconds(data.startTime);
    const b = comparablePickerTimeSeconds(data.endTime);
    if (a == null || b == null) return;
    if (b <= a) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message:
          'End time must be after start time on the same calendar day. Overnight ranges are only allowed for daily tasks.',
      });
    }
  });

const trackerCenterDefaultValues = {
  taskTitle: '',
  floor: '',
  assigneeIds: [],
  assigneeRoleName: '',
  trackerTaskMasterTemplate: '',
  masterTaskName: '',
  frequencyCount: '',
  weekdayIds: [],
  monthWeekIds: [],
  yearMonthIds: [],
  frequency: '',
  startTime: '',
  endTime: '',
  schedule: [],
  description: '',
  isImageMandatory: true,
  checklists: [{ checklist_title: '', disabled: 0 }],
};

/** Map Tracker Task Master GET `data` into center-task form fields (schedule stays user-edited). */
const mapTrackerTaskMasterDocToCenterPrefill = (doc) => {
  if (!doc || typeof doc !== 'object') {
    return {
      taskTitle: '',
      description: '',
      checklists: [{ checklist_title: '', disabled: 0 }],
      assigneeRoleName: '',
      trackerTaskMasterTemplate: '',
      masterTaskName: '',
    };
  }
  const normalized = normalizeChecklistFromApi(doc.checklists ?? []);
  return {
    taskTitle: String(doc.task_name ?? doc.name ?? '').trim(),
    description: String(doc.description ?? '').trim(),
    checklists: normalized.length > 0 ? normalized : [{ checklist_title: '', disabled: 0 }],
    assigneeRoleName: assigneeRoleFromTrackerSettingsAssignees(doc.assignees),
    trackerTaskMasterTemplate: String(doc.name ?? '').trim(),
    masterTaskName: String(doc.task_name ?? doc.name ?? '').trim(),
  };
};

/** Resolve document `name` from Frappe-style POST /resource/... response */
const extractCreatedResourceName = (response) => {
  const d = response?.data;
  if (!d) return null;
  if (d.data?.name) return String(d.data.name);
  if (d.data?.data?.name) return String(d.data.data.name);
  if (Array.isArray(d.docs) && d.docs[0]?.name) return String(d.docs[0].name);
  if (d.message?.name) return String(d.message.name);
  if (typeof d.data === 'string') return d.data;
  return null;
};

const uploadCenterTrackerTaskPhotos = async (taskName, attachmentItems) => {
  const files = (attachmentItems ?? []).map((a) => a?.file).filter((f) => f instanceof File);
  if (files.length === 0 || !taskName) return;

  const formData = new FormData();
  formData.append('task_name', taskName);
  files.forEach((file) => {
    formData.append('files', file);
  });

  await apiClient.post(
    '/method/devx.tracker.api.api_center_tracker_task.add_center_tracker_task_photo',
    formData,
  );
};

/** `row_id` in the API body is the photo row id from task detail (`photos[].id`). */
const removeCenterTrackerTaskPhotoApi = async (taskName, photoId) => {
  await apiClient.post(
    '/method/devx.tracker.api.api_center_tracker_task.remove_center_tracker_task_photo',
    {
      task_name: taskName,
      row_id: photoId,
    },
  );
};

/** Build absolute URL for task photo (API may return `photo_url` or relative `photo`). */
const getCenterTaskPhotoFileUrl = (p) => {
  const raw = p?.photo_url || p?.photo || '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(String(raw))) return String(raw);
  const base = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const path = String(raw).startsWith('/') ? raw : `/${raw}`;
  return base ? `${base}${path}` : path;
};

/**
 * Rows for AttachmentList — same shape as ticket server attachments (fileUrl, fileName, id).
 * See ticket-view-drawer normalizeTicketAttachments + AttachmentList.
 */
const normalizeCenterTaskPhotosForPreview = (photos) => {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((p) => p && (p.photo_url || p.photo))
    .map((p, index) => {
      const fileUrl = getCenterTaskPhotoFileUrl(p);
      const pathString = String(p.photo || p.photo_url || '');
      const fileName = pathString.split('/').pop() || `photo-${index + 1}`;
      const photoRowId = String(p?.id ?? p?.name ?? '').trim();
      return {
        id: photoRowId || `center-task-photo-${index}`,
        fileName,
        fileUrl,
        size: 0,
        /** Passed to remove API as `row_id` — must match `photos[].id` from task detail. */
        childRowId: photoRowId,
        isServerPhoto: true,
      };
    });
};

/** Map API floor child rows to local marker state keyed by floor label */
const mapApiFloorRowsToMarkerCoordinatesByFloorKey = (floorRows) => {
  const out = {};
  if (!Array.isArray(floorRows)) return out;

  floorRows.forEach((row) => {
    const floorKey = String(row?.floor ?? '').trim();
    const marker = row?.marker_coordinate;
    if (!floorKey || !marker || typeof marker !== 'object') return;

    const points = Array.isArray(marker.points) ? marker.points : [];
    if (points.length === 0) return;

    out[floorKey] = {
      points,
      floor_ref: String(row?.floor_ref ?? marker.floor_ref ?? '').trim(),
      space_id: String(row?.space ?? marker.space_id ?? '').trim(),
      sub_space_id: String(row?.sub_space_id ?? marker.sub_space_id ?? '').trim(),
    };
  });

  return out;
};

/** Preserve child-row `name` and related fields from API floor rows for update payloads. */
const mapApiFloorRowsToFloorRowMetaByFloorKey = (floorRows) => {
  const out = {};
  if (!Array.isArray(floorRows)) return out;

  floorRows.forEach((row) => {
    const floorKey = String(row?.floor ?? '').trim();
    if (!floorKey) return;

    out[floorKey] = {
      name: String(row?.name ?? '').trim(),
      floor: floorKey,
      floor_ref: String(row?.floor_ref ?? '').trim(),
      space: String(row?.space ?? '').trim(),
      sub_space_id: String(row?.sub_space_id ?? '').trim(),
    };
  });

  return out;
};

/** Map GET center tracker task detail API `message` to react-hook-form values for tracker-center source */
const mapCenterTrackerTaskDetailToFormValues = (message) => {
  const vt = String(message.view_type ?? '')
    .trim()
    .toLowerCase();
  const floorRows = Array.isArray(message.floor) ? message.floor : [];
  const floor = String(floorRows[0]?.floor ?? '').trim();

  const assignees = Array.isArray(message.assignees) ? message.assignees : [];
  const roleAssignee = assignees.find(
    (a) => String(a?.assignee_type ?? '').toLowerCase() === 'role',
  );
  const assigneeRoleName = String(roleAssignee?.assignee ?? '').trim();
  const employeeIds = assignees
    .filter((a) => ['employee', 'user'].includes(String(a?.assignee_type ?? '').toLowerCase()))
    .map((a) => String(a?.assignee ?? '').trim())
    .filter(Boolean);
  const assigneeIds =
    employeeIds.length > 0
      ? employeeIds
      : (() => {
          const legacy = String(roleAssignee?.assignee ?? assignees[0]?.assignee ?? '').trim();
          return legacy ? [legacy] : [];
        })();

  const scheduleRaw = Array.isArray(message.schedule)
    ? message.schedule.filter((s) => s && typeof s === 'object' && Object.keys(s).length > 0)
    : [];

  const checklists = normalizeChecklistFromApi(message.checklists ?? []);

  const description = String(message.description ?? '').trim();
  const isImageMandatory = Number(message.is_image_mandatory ?? 1) === 1;

  if (vt === 'daily') {
    const sorted = [...scheduleRaw].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const n = Math.min(100, Math.max(1, sorted.length || 1));
    const frequencyCount = String(n);
    const schedule =
      sorted.length > 0
        ? sorted.slice(0, 100).map((row) => ({
            start_time: normalizeTimeForPicker(row.start_time),
            end_time: normalizeTimeForPicker(row.end_time),
          }))
        : Array.from({ length: n }, () => ({ start_time: '', end_time: '' }));
    return {
      taskTitle: message.center_task_name ?? '',
      floor,
      assigneeIds,
      assigneeRoleName,
      frequencyCount,
      weekdayIds: [],
      monthWeekIds: [],
      yearMonthIds: [],
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule,
      description,
      isImageMandatory,
      checklists,
      trackerTaskMasterTemplate: String(message.tracker_task_master ?? '').trim(),
      masterTaskName: String(message.master_task_name ?? '').trim(),
    };
  }

  if (vt === 'weekly') {
    const sorted = [...scheduleRaw].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const weekdayIds = sorted.map((row) => String(row.frequency));
    const schedule = sorted.map((row) => ({
      start_time: normalizeTimeForPicker(row.start_time),
      end_time: normalizeTimeForPicker(row.end_time),
    }));
    return {
      taskTitle: message.center_task_name ?? '',
      floor,
      assigneeIds,
      assigneeRoleName,
      frequencyCount: '1',
      weekdayIds,
      monthWeekIds: [],
      yearMonthIds: [],
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule: schedule.length > 0 ? schedule : [],
      description,
      isImageMandatory,
      checklists,
      trackerTaskMasterTemplate: String(message.tracker_task_master ?? '').trim(),
      masterTaskName: String(message.master_task_name ?? '').trim(),
    };
  }

  if (vt === 'monthly') {
    const sorted = [...scheduleRaw].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const monthWeekIds = sorted.map((row) => String(Number(row.frequency) || 1));
    const schedule =
      sorted.length > 0
        ? sorted.map((row) => ({
            start_day: String(row.start_day ?? ''),
            end_day:
              row.end_day != null && String(row.end_day).trim() !== '' ? String(row.end_day) : '',
          }))
        : [];
    return {
      taskTitle: message.center_task_name ?? '',
      floor,
      assigneeIds,
      assigneeRoleName,
      frequencyCount: '1',
      weekdayIds: [],
      monthWeekIds,
      yearMonthIds: [],
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule: schedule.length > 0 ? schedule : [],
      description,
      isImageMandatory,
      checklists,
      trackerTaskMasterTemplate: String(message.tracker_task_master ?? '').trim(),
      masterTaskName: String(message.master_task_name ?? '').trim(),
    };
  }

  if (vt === 'annually') {
    const sorted = [...scheduleRaw].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const yearMonthIds = sorted.map((row) => String(Number(row.frequency) || 1));
    const schedule =
      sorted.length > 0
        ? sorted.map((row) => ({
            start_day: String(row.start_day ?? ''),
            end_day:
              row.end_day != null && String(row.end_day).trim() !== '' ? String(row.end_day) : '',
          }))
        : [];
    return {
      taskTitle: message.center_task_name ?? '',
      floor,
      assigneeIds,
      assigneeRoleName,
      frequencyCount: '1',
      weekdayIds: [],
      monthWeekIds: [],
      yearMonthIds,
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule: schedule.length > 0 ? schedule : [],
      description,
      isImageMandatory,
      checklists,
      trackerTaskMasterTemplate: String(message.tracker_task_master ?? '').trim(),
      masterTaskName: String(message.master_task_name ?? '').trim(),
    };
  }

  const row = scheduleRaw[0] ?? {};
  const startTime = normalizeTimeForPicker(row.start_time);
  const endTime = normalizeTimeForPicker(row.end_time);
  return {
    taskTitle: message.center_task_name ?? '',
    floor,
    assigneeIds,
    assigneeRoleName,
    frequencyCount: '1',
    weekdayIds: [],
    monthWeekIds: [],
    yearMonthIds: [],
    frequency: String(row.frequency ?? '1'),
    startTime,
    endTime,
    schedule: [{ start_time: startTime, end_time: endTime }],
    description,
    isImageMandatory,
    checklists,
    trackerTaskMasterTemplate: String(message.tracker_task_master ?? '').trim(),
    masterTaskName: String(message.master_task_name ?? '').trim(),
  };
};

const taskDefaultValues = {
  taskTitle: '',
  floor: '',
  assignee: '',
  frequency: '',
  startTime: '',
  description: '',
  checklists: [{ checklist_title: '', disabled: 0 }],
};
const settingsDefaultValues = {
  taskTitle: '',
  assigneeRole: '',
  description: '',
  checklists: [{ checklist_title: '', disabled: 0 }],
};

const CreateTrackerTaskDrawer = ({
  open,
  centerId,
  onClose,
  onSubmit,
  isSubmitting = false,
  mode = 'create',
  initialValues,
  source = 'tracker-task', // 'tracker-task' | 'tracker-settings' | 'tracker-center'
  floorOptions = [
    { value: 'B1', label: 'B1' },
    { value: 'G', label: 'G' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ],
  assigneeOptions = [
    { value: 'Housekeeping', label: 'Housekeeping' },
    { value: 'Supervisor', label: 'Supervisor' },
  ],
  frequencyOptions = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
  ],
  startTimeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, '0');
    return { value: `${hour}:00:00`, label: `${hour}:00` };
  }),
  /** Tracker Master document name (e.g. Hartik Tracker) — required for center task create */
  trackerName,
  /** From get_trackers_by_center: Daily | Weekly | Monthly | Annually */
  viewType,
  /** Center Tracker Task document name (`name`) when editing */
  editingTaskName,
  /** When set with `mode="create"`, load this task once and prefill the form (copy / duplicate). */
  duplicateFromTaskName,
}) => {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isCenterTaskSaving, setIsCenterTaskSaving] = useState(false);
  const [centerTaskDetailLoading, setCenterTaskDetailLoading] = useState(false);
  const [settingsSupportRolesLoading, setSettingsSupportRolesLoading] = useState(false);
  const [layoutBundleFloors, setLayoutBundleFloors] = useState([]);
  const [layoutBundleLoading, setLayoutBundleLoading] = useState(false);
  const [layoutBundleError, setLayoutBundleError] = useState(null);
  const [isLayoutPanelOpen, setIsLayoutPanelOpen] = useState(false);
  const [layoutFloorKey, setLayoutFloorKey] = useState('');
  const [markerCoordinatesByFloorKey, setMarkerCoordinatesByFloorKey] = useState({});
  const [floorRowMetaByFloorKey, setFloorRowMetaByFloorKey] = useState({});
  const [isLayoutMarkerEditMode, setIsLayoutMarkerEditMode] = useState(false);
  const isTrackerSettings = source === 'tracker-settings' || source === 'settings';
  const isTrackerCenter = source === 'tracker-center';

  useEffect(() => {
    if (!open || !isTrackerSettings) {
      setSettingsSupportRolesLoading(false);
      return;
    }
    setSettingsSupportRolesLoading(true);
  }, [open, isTrackerSettings]);
  const isDailyView =
    isTrackerCenter &&
    String(viewType ?? '')
      .trim()
      .toLowerCase() === 'daily';
  const isWeeklyView =
    isTrackerCenter &&
    String(viewType ?? '')
      .trim()
      .toLowerCase() === 'weekly';
  const isMonthlyView =
    isTrackerCenter &&
    String(viewType ?? '')
      .trim()
      .toLowerCase() === 'monthly';
  const isAnnuallyView =
    isTrackerCenter &&
    String(viewType ?? '')
      .trim()
      .toLowerCase() === 'annually';

  const isDuplicatingCenterTask = Boolean(
    isTrackerCenter && mode === 'create' && String(duplicateFromTaskName ?? '').trim(),
  );

  const centerTaskBlockingLoad = useMemo(
    () =>
      isTrackerCenter && centerTaskDetailLoading && (mode === 'edit' || isDuplicatingCenterTask),
    [isTrackerCenter, centerTaskDetailLoading, mode, isDuplicatingCenterTask],
  );

  const validationSchema = useMemo(() => {
    if (isTrackerSettings) return trackerSettingsSchema;
    if (isTrackerCenter) {
      if (isDailyView) return trackerCenterDailySchema;
      if (isWeeklyView) return trackerCenterWeeklySchema;
      if (isMonthlyView) return trackerCenterMonthlySchema;
      if (isAnnuallyView) return trackerCenterAnnuallySchema;
      return trackerCenterNonDailySchema;
    }
    return trackerTaskSchema;
  }, [
    isTrackerSettings,
    isTrackerCenter,
    isDailyView,
    isWeeklyView,
    isMonthlyView,
    isAnnuallyView,
  ]);

  const formDefaultValues = useMemo(() => {
    if (isTrackerSettings) return settingsDefaultValues;
    if (isTrackerCenter) return trackerCenterDefaultValues;
    return taskDefaultValues;
  }, [isTrackerSettings, isTrackerCenter]);
  const [attachments, setAttachments] = useState([]);
  /** Existing photos from GET center task detail (edit mode) — AttachmentList-compatible */
  const [centerTaskServerPhotos, setCenterTaskServerPhotos] = useState([]);
  const [isCenterTaskPhotoUploading, setIsCenterTaskPhotoUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileInputId = useId();

  const dispatch = useDispatch();
  const taskDetails = useSelector((state) => state.settingsTracker.taskDetail?.data);
  const taskDetailLoading = useSelector((state) => state.settingsTracker.taskDetail?.isLoading);

  const floorByCenter = useSelector((state) => state.centerTracker.floorByCenter?.data);
  const floorByCenterRef = useRef(floorByCenter);
  const initializedSettingsEditDocRef = useRef(null);
  const initializedSettingsCreateRef = useRef(false);
  const syncedTaskDetailDocRef = useRef(null);
  useEffect(() => {
    floorByCenterRef.current = floorByCenter;
  }, [floorByCenter]);

  const supervisorMultiSelectOptions = useMemo(
    () =>
      assigneeOptions.map((o) => ({
        ...o,
        user_role: o.user_role ?? 'Supervisor',
      })),
    [assigneeOptions],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: formDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'checklists',
  });

  const checklistErrorMessage = useMemo(() => {
    if (!isSubmitted) return '';
    const rootMessage =
      errors?.checklists?.message ??
      errors?.checklists?.root?.message ??
      errors?.checklists?.refine?.message;
    return rootMessage ? String(rootMessage) : '';
  }, [errors, isSubmitted]);

  const { fields: scheduleFields } = useFieldArray({
    control,
    name: 'schedule',
  });

  const frequencyCountWatch = watch('frequencyCount');
  const weekdayIdsWatch = watch('weekdayIds');
  const monthWeekIdsWatch = watch('monthWeekIds');
  const yearMonthIdsWatch = watch('yearMonthIds');
  /** useWatch ensures nested schedule.* fields (e.g. annual start_day) update this trigger reliably */
  const scheduleWatch = useWatch({ control, name: 'schedule', defaultValue: [] });
  const checklistsWatch = useWatch({ control, name: 'checklists', defaultValue: [] });
  const startTimeWatch = watch('startTime');
  const endTimeWatch = watch('endTime');
  const assigneeRoleNameWatch = watch('assigneeRoleName');
  const trackerTaskMasterTemplateWatch = watch('trackerTaskMasterTemplate');
  const masterTaskNameWatch = watch('masterTaskName');
  const watchedFloor = useWatch({ control, name: 'floor', defaultValue: '' });

  const trackerTaskMasterListState = useSelector((s) => s.centerTracker.trackerTaskMasterList);
  const teamMembersByRoleMap = useSelector((s) => s.centerTracker.teamMembersByRole?.byRole ?? {});
  const allMembersAtCenter = useSelector(
    (s) => s.centerTracker.teamMembersByRole?.allMembers ?? [],
  );

  const mergedCenterAssigneeOptions = useMemo(() => {
    if (!isTrackerCenter) return supervisorMultiSelectOptions;
    const base = supervisorMultiSelectOptions;
    const templateSelected = String(trackerTaskMasterTemplateWatch ?? '').trim();
    const role = String(assigneeRoleNameWatch ?? '').trim();
    const mergeList = (list, roleLabel) => {
      if (!Array.isArray(list) || list.length === 0) return base;
      const map = new Map(base.map((o) => [String(o.value), { ...o }]));
      list.forEach((o) => {
        if (o?.value) {
          map.set(String(o.value), {
            ...o,
            user_role: o.user_role ?? roleLabel ?? 'Team member',
          });
        }
      });
      return [...map.values()];
    };

    if (!templateSelected) {
      return mergeList(allMembersAtCenter, 'Team member');
    }

    if (role) {
      const fromRole = teamMembersByRoleMap[role] ?? [];
      return mergeList(fromRole.length > 0 ? fromRole : allMembersAtCenter, role);
    }

    return mergeList(allMembersAtCenter, 'Team member');
  }, [
    isTrackerCenter,
    supervisorMultiSelectOptions,
    teamMembersByRoleMap,
    allMembersAtCenter,
    assigneeRoleNameWatch,
    trackerTaskMasterTemplateWatch,
  ]);

  const weeklyPreviousSortedRef = useRef([]);
  const monthlyPreviousSortedRef = useRef([]);
  const annualPreviousSortedRef = useRef([]);

  const dailyTimeSlotBadges = useMemo(() => {
    const sched = Array.isArray(scheduleWatch) ? scheduleWatch : [];
    const resolveLabel = (raw) => {
      const trimmed = String(raw ?? '').trim();
      if (!trimmed) return '';
      const normalized = normalizeTimeForPicker(trimmed);
      const key = normalized || trimmed;
      const opt = startTimeOptions.find((o) => String(o.value) === String(key));
      if (opt) return opt.label;
      return normalized.replace(/:\d{2}$/, '') || trimmed;
    };
    const badges = [];
    sched.forEach((row, index) => {
      const startLabel = resolveLabel(row?.start_time);
      const endLabel = resolveLabel(row?.end_time);
      if (!startLabel && !endLabel) return;
      const text = startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel || endLabel;
      badges.push({ key: `daily-slot-${index}`, text });
    });
    return badges;
  }, [scheduleWatch, startTimeOptions]);

  const weeklyTimePopoverSummary = useMemo(() => {
    const sched = Array.isArray(scheduleWatch) ? scheduleWatch : [];
    const raw = Array.isArray(weekdayIdsWatch) ? weekdayIdsWatch : [];
    const n = raw.length;
    const withStart = sched.filter((r) => String(r?.start_time ?? '').trim()).length;
    if (n === 0) return 'Select time';
    if (withStart === 0) return 'Select time';
    return `${withStart}/${n} day${n === 1 ? '' : 's'}`;
  }, [scheduleWatch, weekdayIdsWatch]);

  /** Month/week + day range chips for center tracker Monthly Time popover trigger */
  const monthlyScheduleBadges = useMemo(() => {
    const sched = Array.isArray(scheduleWatch) ? scheduleWatch : [];
    const weeks = Array.isArray(monthWeekIdsWatch) ? monthWeekIdsWatch : [];
    const badges = [];
    sched.forEach((row, index) => {
      const wv = weeks[index];
      const weekLabel =
        MONTH_WEEK_OPTIONS.find((o) => o.value === String(wv))?.label ?? `Week ${index + 1}`;
      const sd = String(row?.start_day ?? '').trim();
      const ed = String(row?.end_day ?? '').trim();
      if (!sd && !ed) return;
      const resolveDay = (v) =>
        MONTH_DAY_NUMERIC_OPTIONS.find((o) => o.value === String(v))?.label ?? String(v);
      const range = sd && ed ? `${resolveDay(sd)} – ${resolveDay(ed)}` : resolveDay(sd || ed);
      badges.push({ key: `month-${String(wv)}-${index}`, text: `${weekLabel}: ${range}` });
    });
    return badges;
  }, [scheduleWatch, monthWeekIdsWatch]);

  const nonDailyTimePopoverSummary = useMemo(() => {
    const st = String(startTimeWatch ?? '').trim();
    const et = String(endTimeWatch ?? '').trim();
    if (!st) return 'Select time';
    const label = (v) => startTimeOptions.find((o) => o.value === v)?.label ?? v;
    return et ? `${label(st)} – ${label(et)}` : label(st);
  }, [startTimeWatch, endTimeWatch, startTimeOptions]);

  useEffect(() => {
    if (!open || !isTrackerCenter || !isDailyView) return;
    const parsed = Number.parseInt(String(frequencyCountWatch ?? ''), 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      // No frequency selected yet — clear schedule so no stale slots show
      const current = getValues('schedule') || [];
      if (current.length > 0) setValue('schedule', [], { shouldValidate: false });
      return;
    }
    const n = Math.min(100, parsed);
    const current = getValues('schedule') || [];
    if (current.length === n) return;
    const next = Array.from(
      { length: n },
      (_, i) => current[i] || { start_time: '', end_time: '' },
    );
    setValue('schedule', next, { shouldValidate: false });
  }, [open, isTrackerCenter, isDailyView, frequencyCountWatch, getValues, setValue]);

  useEffect(() => {
    if (!open || !isTrackerCenter || !isMonthlyView) {
      if (!open) monthlyPreviousSortedRef.current = [];
      return;
    }
    const raw = getValues('monthWeekIds');
    const sorted = [
      ...new Set((Array.isArray(raw) ? raw : []).map((x) => Number.parseInt(String(x), 10))),
    ]
      .filter((n) => n >= 1 && n <= 5)
      .sort((a, b) => a - b);
    const previous = monthlyPreviousSortedRef.current;
    const current = getValues('schedule') || [];
    const next = sorted.map((id) => {
      const previousIndex = previous.indexOf(id);
      if (previousIndex >= 0 && current[previousIndex]) {
        return {
          start_day: String(current[previousIndex].start_day ?? ''),
          end_day: String(current[previousIndex].end_day ?? ''),
        };
      }
      return { start_day: '', end_day: '' };
    });
    monthlyPreviousSortedRef.current = sorted;
    const sameLengthAndDays =
      current.length === next.length &&
      next.every(
        (row, index) =>
          String(current[index]?.start_day ?? '') === row.start_day &&
          String(current[index]?.end_day ?? '') === row.end_day,
      );
    if (sameLengthAndDays) return;
    setValue('schedule', next, { shouldValidate: false });
  }, [open, isTrackerCenter, isMonthlyView, monthWeekIdsWatch, getValues, setValue]);

  useEffect(() => {
    if (!open || !isTrackerCenter || !isAnnuallyView) {
      if (!open) annualPreviousSortedRef.current = [];
      return;
    }
    const raw = getValues('yearMonthIds');
    const sorted = [
      ...new Set((Array.isArray(raw) ? raw : []).map((x) => Number.parseInt(String(x), 10))),
    ]
      .filter((n) => n >= 1 && n <= 12)
      .sort((a, b) => a - b);
    const previous = annualPreviousSortedRef.current;
    const current = getValues('schedule') || [];
    const next = sorted.map((id) => {
      const previousIndex = previous.indexOf(id);
      if (previousIndex >= 0 && current[previousIndex]) {
        return {
          start_day: String(current[previousIndex].start_day ?? ''),
          end_day: String(current[previousIndex].end_day ?? ''),
        };
      }
      return { start_day: '', end_day: '' };
    });
    annualPreviousSortedRef.current = sorted;
    const sameLengthAndDays =
      current.length === next.length &&
      next.every(
        (row, index) =>
          String(current[index]?.start_day ?? '') === row.start_day &&
          String(current[index]?.end_day ?? '') === row.end_day,
      );
    if (sameLengthAndDays) return;
    setValue('schedule', next, { shouldValidate: false });
  }, [open, isTrackerCenter, isAnnuallyView, yearMonthIdsWatch, getValues, setValue]);

  useEffect(() => {
    if (!open || !isTrackerCenter || !isWeeklyView) {
      if (!open) weeklyPreviousSortedRef.current = [];
      return;
    }
    const raw = getValues('weekdayIds');
    const sorted = [
      ...new Set((Array.isArray(raw) ? raw : []).map((x) => Number.parseInt(String(x), 10))),
    ]
      .filter((n) => n >= 1 && n <= 7)
      .sort((a, b) => a - b);
    const previous = weeklyPreviousSortedRef.current;
    const current = getValues('schedule') || [];
    const next = sorted.map((id) => {
      const previousIndex = previous.indexOf(id);
      if (previousIndex >= 0 && current[previousIndex]) {
        return {
          start_time: current[previousIndex].start_time ?? '',
          end_time: current[previousIndex].end_time ?? '',
        };
      }
      return { start_time: '', end_time: '' };
    });
    weeklyPreviousSortedRef.current = sorted;
    const sameLengthAndTimes =
      current.length === next.length &&
      next.every(
        (row, index) =>
          current[index]?.start_time === row.start_time &&
          current[index]?.end_time === row.end_time,
      );
    if (sameLengthAndTimes) return;
    setValue('schedule', next, { shouldValidate: false });
  }, [open, isTrackerCenter, isWeeklyView, weekdayIdsWatch, getValues, setValue]);

  const editingDocumentName = initialValues?.docName ?? initialValues?.taskTitle ?? '';

  const [baseline, setBaseline] = useState(null);
  const values = watch();
  const isDirty = useMemo(() => {
    if (!baseline) return false;
    const payload = {
      taskTitle: values?.taskTitle ?? '',
      description: values?.description ?? '',
      checklists: (values?.checklists ?? []).map((c) => ({
        name: c?.name,
        checklist_title: String(c?.checklist_title ?? '').trim(),
        disabled: Number(c?.disabled) ? 1 : 0,
      })),
    };
    if (isTrackerSettings) {
      payload.assigneeRole = values?.assigneeRole ?? '';
    }
    return JSON.stringify(payload) !== baseline;
  }, [baseline, values, isTrackerSettings]);

  const handleRemoveChecklistItem = async (index) => {
    const row = fields?.[index];
    const taskTitleForApi = String(editingDocumentName || values?.taskTitle || '').trim();

    // In edit mode, deleting an existing checklist should call backend API.
    if (mode === 'edit' && isTrackerSettings && row?.name) {
      try {
        await apiClient.post(
          '/method/devx.tracker.doctype.tracker_task_master.tracker_task_master.delete_checklist',
          {
            task: taskTitleForApi,
            checklist: row.name,
          },
        );
        await dispatch(fetchTaskDetailThunk(taskTitleForApi));
        return;
      } catch (error) {
        showErrorToast(error);
        return;
      }
    }

    if (fields.length <= 1) {
      setValue('checklists.0.checklist_title', '', { shouldDirty: true, shouldTouch: true });
      setValue('checklists.0.disabled', 0, { shouldDirty: true, shouldTouch: true });
      return;
    }
    remove(index);
  };

  const handleChecklistToggle = async (index, nextChecked) => {
    const nextDisabled = nextChecked ? 0 : 1;

    setValue(`checklists.${index}.disabled`, nextDisabled, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleFetchFloorByCenter = async () => {
    try {
      await dispatch(fetchFloorByCenterThunk(centerId)).unwrap();
    } catch (error) {
      showErrorToast(error);
    }
  };

  useEffect(() => {
    if (!open || !isTrackerCenter || !centerId) {
      setLayoutBundleFloors([]);
      setLayoutBundleError(null);
      setLayoutBundleLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLayoutBundleLoading(true);
    setLayoutBundleError(null);

    fetchCenterTrackerLayoutBundle(centerId)
      .then((payload) => {
        if (cancelled) return;
        setLayoutBundleFloors(Array.isArray(payload?.floors) ? payload.floors : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setLayoutBundleFloors([]);
        setLayoutBundleError(
          extractErrorMessage(error) || 'Failed to load floor layouts for this center.',
        );
      })
      .finally(() => {
        if (!cancelled) setLayoutBundleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isTrackerCenter, centerId]);

  const activeLayoutBundleFloor = useMemo(() => {
    const key = String(layoutFloorKey ?? '').trim();
    if (key) {
      return findCenterTrackerLayoutBundleFloor(layoutBundleFloors, key);
    }
    return resolveCenterTrackerLayoutFloorForSelection(
      layoutBundleFloors,
      layoutFloorKey || watchedFloor,
    );
  }, [layoutBundleFloors, layoutFloorKey, watchedFloor]);

  const activeLayoutDetail = activeLayoutBundleFloor?.layout_detail ?? null;
  const activeLayoutFloorRef = String(activeLayoutBundleFloor?.floor_ref ?? '').trim();

  const activeLayoutFloorKey = String(layoutFloorKey || watchedFloor || '').trim();

  const activeMarkerCoordinate = activeLayoutFloorKey
    ? (markerCoordinatesByFloorKey[activeLayoutFloorKey] ?? null)
    : null;

  const activeMarkerSpaceId = String(
    activeMarkerCoordinate?.space_id ?? floorRowMetaByFloorKey[activeLayoutFloorKey]?.space ?? '',
  ).trim();

  const showLayoutMarkerViewPanel =
    mode === 'edit' &&
    isLayoutPanelOpen &&
    !isLayoutMarkerEditMode &&
    Boolean(activeMarkerCoordinate);

  const canOpenLayoutPanel = useMemo(() => {
    if (!isTrackerCenter || !centerId) return false;
    const floorKey = String(watchedFloor ?? '').trim();
    if (!floorKey) return false;
    return Boolean(findCenterTrackerLayoutBundleFloor(layoutBundleFloors, floorKey));
  }, [isTrackerCenter, centerId, watchedFloor, layoutBundleFloors]);

  const handleOpenLayoutPanel = useCallback(() => {
    if (!canOpenLayoutPanel) return;
    const nextKey = String(watchedFloor ?? '').trim();
    if (!nextKey) return;
    const hasMarker = Boolean(markerCoordinatesByFloorKey[nextKey]);
    setLayoutFloorKey(nextKey);
    setIsLayoutMarkerEditMode(mode !== 'edit' || !hasMarker);
    setIsLayoutPanelOpen(true);
  }, [canOpenLayoutPanel, watchedFloor, markerCoordinatesByFloorKey, mode]);

  const handleCloseLayoutPanel = useCallback(() => {
    setIsLayoutPanelOpen(false);
    setIsLayoutMarkerEditMode(false);
  }, []);

  const handleLayoutMarkerPanelClose = useCallback(() => {
    if (mode === 'edit' && activeMarkerCoordinate) {
      setIsLayoutMarkerEditMode(false);
      return;
    }
    handleCloseLayoutPanel();
  }, [mode, activeMarkerCoordinate, handleCloseLayoutPanel]);

  const handleMarkerCoordinateChange = useCallback(
    (coordinate) => {
      const floorKey = String(layoutFloorKey || watchedFloor || '').trim();
      if (!floorKey) return;

      setMarkerCoordinatesByFloorKey((previous) => {
        if (!coordinate) {
          if (!previous[floorKey]) return previous;
          const next = { ...previous };
          delete next[floorKey];
          return next;
        }
        return { ...previous, [floorKey]: coordinate };
      });
    },
    [layoutFloorKey, watchedFloor],
  );

  useEffect(() => {
    if (!open) {
      setIsLayoutPanelOpen(false);
      setLayoutFloorKey('');
      setMarkerCoordinatesByFloorKey({});
      setFloorRowMetaByFloorKey({});
      setIsLayoutMarkerEditMode(false);
    }
  }, [open]);

  useEffect(() => {
    if (!isLayoutPanelOpen) return;

    const nextKey = String(watchedFloor ?? '').trim();
    if (!nextKey) {
      setIsLayoutPanelOpen(false);
      setLayoutFloorKey('');
      return;
    }

    if (nextKey !== layoutFloorKey) {
      setLayoutFloorKey(nextKey);
      if (mode === 'edit') {
        setIsLayoutMarkerEditMode(!markerCoordinatesByFloorKey[nextKey]);
      }
    }
  }, [watchedFloor, isLayoutPanelOpen, layoutFloorKey, mode, markerCoordinatesByFloorKey]);

  useEffect(() => {
    // Only fetch floors if centerId exists and we're in tracker-center mode
    if (open && centerId && isTrackerCenter) {
      handleFetchFloorByCenter();
    }
  }, [open, centerId, isTrackerCenter]);

  useEffect(() => {
    if (!open || !isTrackerCenter || !centerId) return;
    dispatch(
      fetchAssociatedTeamMembersForRolesThunk({
        center: centerId,
        roles: [],
      }),
    );
  }, [open, isTrackerCenter, centerId, dispatch]);

  useEffect(() => {
    if (!open || !isTrackerCenter || !trackerName) return;
    dispatch(
      fetchTrackerTaskMasterListThunk({
        tracker_id: trackerName,
        keyword: '',
        page: 1,
        limit_page_length: 200,
      }),
    );
  }, [open, isTrackerCenter, trackerName, dispatch]);

  const handleTrackerTaskMasterTemplateChange = useCallback(
    async (docName) => {
      const trimmed = String(docName ?? '').trim();
      if (!trimmed) {
        setValue('trackerTaskMasterTemplate', '', { shouldDirty: true, shouldValidate: false });
        setValue('masterTaskName', '', { shouldDirty: true, shouldValidate: false });
        return;
      }
      if (!centerId) {
        showErrorToast('Center is missing.');
        return;
      }
      try {
        const doc = await dispatch(fetchTrackerTaskMasterDetailThunk(trimmed)).unwrap();
        const pre = mapTrackerTaskMasterDocToCenterPrefill(doc);
        setValue('trackerTaskMasterTemplate', pre.trackerTaskMasterTemplate, {
          shouldDirty: true,
          shouldValidate: false,
        });
        setValue('masterTaskName', pre.masterTaskName, {
          shouldDirty: true,
          shouldValidate: false,
        });
        setValue('taskTitle', pre.taskTitle, { shouldDirty: true, shouldValidate: false });
        setValue('description', pre.description, { shouldDirty: true, shouldValidate: false });
        setValue('checklists', pre.checklists, { shouldDirty: true, shouldValidate: false });
        setValue('assigneeRoleName', pre.assigneeRoleName, {
          shouldDirty: true,
          shouldValidate: false,
        });
        setIsDescriptionOpen(Boolean(String(pre.description ?? '').trim()));
        const role = String(pre.assigneeRoleName ?? '').trim();
        if (role) {
          const { byRole } = await dispatch(
            fetchAssociatedTeamMembersForRolesThunk({ center: centerId, roles: [role] }),
          ).unwrap();
          const opts = byRole[role] ?? [];
          setValue(
            'assigneeIds',
            opts.map((o) => o.value),
            { shouldDirty: true, shouldValidate: false },
          );
        } else {
          setValue('assigneeIds', [], { shouldDirty: true, shouldValidate: false });
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [centerId, dispatch, setValue],
  );

  /**
   * Select.Item values are Tracker Task Master document names (`name` / `task_id`).
   * Detail API may send `master_task_name` (display) without a matching `tracker_task_master`,
   * or `tracker_task_master` may not exactly match list keys — resolve once the list is loaded.
   */
  useEffect(() => {
    if (!open || !isTrackerCenter) return;
    const results = Array.isArray(trackerTaskMasterListState?.results)
      ? trackerTaskMasterListState.results
      : [];
    if (results.length === 0) return;

    const doc = String(trackerTaskMasterTemplateWatch ?? '').trim();
    const nameLabel = String(masterTaskNameWatch ?? '').trim();
    if (!doc && !nameLabel) return;

    const rowById = (id) => results.find((r) => String(r?.name ?? r?.task_id ?? '').trim() === id);

    if (doc && rowById(doc)) return;

    const norm = (s) =>
      String(s ?? '')
        .trim()
        .toLowerCase();
    let match = null;
    if (nameLabel) {
      match = results.find(
        (r) =>
          norm(r.task_name) === norm(nameLabel) ||
          norm(r.name) === norm(nameLabel) ||
          norm(r.task_id) === norm(nameLabel),
      );
    }
    if (!match && doc) {
      match = results.find(
        (r) =>
          norm(r.task_name) === norm(doc) ||
          norm(r.name) === norm(doc) ||
          norm(r.task_id) === norm(doc),
      );
    }
    if (!match) return;

    const id = String(match.name ?? match.task_id ?? '').trim();
    if (!id) return;
    if (id !== doc) {
      setValue('trackerTaskMasterTemplate', id, { shouldDirty: false, shouldValidate: false });
    }
    const label = String(match.task_name ?? match.name ?? '').trim();
    if (label && norm(label) !== norm(nameLabel)) {
      setValue('masterTaskName', label, { shouldDirty: false, shouldValidate: false });
    }
  }, [
    open,
    isTrackerCenter,
    trackerTaskMasterListState?.results,
    trackerTaskMasterTemplateWatch,
    masterTaskNameWatch,
    setValue,
  ]);

  useEffect(() => {
    if (!open) {
      initializedSettingsEditDocRef.current = null;
      initializedSettingsCreateRef.current = false;
      syncedTaskDetailDocRef.current = null;
      return;
    }

    if (mode === 'create' && isTrackerSettings) {
      dispatch(clearTaskDetail());
      if (initializedSettingsCreateRef.current) return;
      initializedSettingsCreateRef.current = true;
      reset(settingsDefaultValues);
      setIsDescriptionOpen(false);
      setAttachments([]);
      setDragActive(false);
      setFileError(null);
      setBaseline(
        JSON.stringify({
          taskTitle: '',
          assigneeRole: '',
          description: '',
          checklists: [{ checklist_title: '', disabled: 0 }],
        }),
      );
      return;
    }

    if (mode === 'edit' && isTrackerSettings && initialValues) {
      const editDocKey =
        String(initialValues.docName ?? '').trim() || String(initialValues.taskTitle ?? '').trim();
      if (initializedSettingsEditDocRef.current === editDocKey) {
        return;
      }
      initializedSettingsEditDocRef.current = editDocKey;

      const listChecklists = Array.isArray(initialValues.checklistItems)
        ? initialValues.checklistItems.map((c) =>
            typeof c === 'string' ? { checklist_title: c, disabled: 0 } : c,
          )
        : [];
      const normalized = normalizeChecklistFromApi(listChecklists);
      const roleFromInitial =
        initialValues.assigneeRole ??
        assigneeRoleFromTrackerSettingsAssignees(initialValues.assignees) ??
        '';
      reset({
        taskTitle: initialValues.taskTitle ?? '',
        assigneeRole: roleFromInitial,
        description: initialValues.description ?? '',
        checklists: normalized,
      });
      setIsDescriptionOpen(Boolean(initialValues.description?.trim?.()));
      setAttachments([]);
      setDragActive(false);
      setFileError(null);
      setBaseline(
        JSON.stringify({
          taskTitle: initialValues.taskTitle ?? '',
          assigneeRole: roleFromInitial,
          description: initialValues.description ?? '',
          checklists: normalized.map((c) => ({
            name: c?.name,
            checklist_title: String(c?.checklist_title ?? '').trim(),
            disabled: Number(c?.disabled) ? 1 : 0,
          })),
        }),
      );
      return;
    }

    if (mode === 'edit' && !isTrackerSettings && initialValues && !isTrackerCenter) {
      const normalized = normalizeChecklistFromApi(initialValues.checklistItems ?? []);
      reset({
        taskTitle: initialValues.taskTitle ?? '',
        floor: initialValues.floor ?? '',
        assignee: initialValues.assignee ?? '',
        frequency: initialValues.frequency ?? '',
        frequencyCount: initialValues.frequencyCount ?? '1',
        weekdayIds: initialValues.weekdayIds ?? [],
        monthWeekIds: initialValues.monthWeekIds ?? [],
        yearMonthIds: initialValues.yearMonthIds ?? [],
        startTime: initialValues.startTime ?? '',
        endTime: initialValues.endTime ?? '',
        schedule: initialValues.schedule ?? [
          { start_time: initialValues.startTime ?? '', end_time: initialValues.endTime ?? '' },
        ],
        description: initialValues.description ?? '',
        checklists: normalized,
      });
      setIsDescriptionOpen(Boolean(initialValues.description?.trim?.()));
      setAttachments([]);
      setDragActive(false);
      setFileError(null);
      setBaseline(
        JSON.stringify({
          taskTitle: initialValues.taskTitle ?? '',
          description: initialValues.description ?? '',
          checklists: normalized.map((c) => ({
            name: c?.name,
            checklist_title: String(c?.checklist_title ?? '').trim(),
            disabled: Number(c?.disabled) ? 1 : 0,
          })),
        }),
      );
      return;
    }

    if (mode === 'create' && isTrackerCenter) {
      if (String(duplicateFromTaskName ?? '').trim()) {
        return;
      }
      reset({
        ...trackerCenterDefaultValues,
        checklists: [{ checklist_title: '', disabled: 0 }],
      });
      setIsDescriptionOpen(false);
      setAttachments([]);
      setCenterTaskServerPhotos([]);
      setDragActive(false);
      setFileError(null);
      setValue('checklists', [{ checklist_title: '', disabled: 0 }], {
        shouldDirty: false,
        shouldTouch: false,
      });
      return;
    }

    if (mode === 'edit' && isTrackerCenter) {
      return;
    }

    reset(isTrackerSettings ? settingsDefaultValues : taskDefaultValues);
    setIsDescriptionOpen(false);
    setAttachments([]);
    setDragActive(false);
    setFileError(null);
    setValue('checklists', [{ checklist_title: '', disabled: 0 }], {
      shouldDirty: false,
      shouldTouch: false,
    });
    setBaseline(
      JSON.stringify(
        isTrackerSettings
          ? {
              taskTitle: '',
              assigneeRole: '',
              description: '',
              checklists: [{ checklist_title: '', disabled: 0 }],
            }
          : {
              taskTitle: '',
              description: '',
              checklists: [{ checklist_title: '', disabled: 0 }],
            },
      ),
    );
  }, [
    open,
    reset,
    setValue,
    mode,
    editingDocumentName,
    isTrackerSettings,
    isTrackerCenter,
    dispatch,
    duplicateFromTaskName,
    initialValues,
  ]);

  useEffect(() => {
    if (!open) {
      setCenterTaskDetailLoading(false);
      return () => {};
    }
    if (!isTrackerCenter) {
      return () => {};
    }

    const dupName = String(duplicateFromTaskName ?? '').trim();
    const editName = String(editingTaskName ?? '').trim();
    const fetchName = mode === 'edit' ? editName : mode === 'create' && dupName ? dupName : '';
    if (!fetchName) {
      setCenterTaskDetailLoading(false);
      return () => {};
    }

    const isDuplicate = mode === 'create' && Boolean(dupName);

    let cancelled = false;

    const load = async () => {
      setCenterTaskDetailLoading(true);
      setCenterTaskServerPhotos([]);
      try {
        const response = await apiClient.get(
          '/method/devx.tracker.api.api_center_tracker_task.get_center_tracker_task_detail',
          { params: { name: fetchName } },
        );
        const message = response?.data?.message ?? response?.data;
        if (cancelled || !message) return;

        if (isDuplicate) {
          setCenterTaskServerPhotos([]);
        } else {
          setCenterTaskServerPhotos(normalizeCenterTaskPhotosForPreview(message.photos));
        }

        const values = mapCenterTrackerTaskDetailToFormValues(message);
        const list = values.checklists?.length
          ? values.checklists
          : [{ checklist_title: '', disabled: 0 }];

        const validFloors = new Set((floorByCenterRef.current ?? []).map((opt) => opt.floor));
        const filteredFloor =
          validFloors.size > 0 && values.floor && !validFloors.has(values.floor)
            ? ''
            : String(values.floor ?? '').trim();

        reset({
          ...values,
          floor: filteredFloor,
          checklists: list,
        });
        setMarkerCoordinatesByFloorKey(mapApiFloorRowsToMarkerCoordinatesByFloorKey(message.floor));
        setFloorRowMetaByFloorKey(
          isDuplicate ? {} : mapApiFloorRowsToFloorRowMetaByFloorKey(message.floor),
        );
        setIsDescriptionOpen(Boolean(String(values.description ?? '').trim()));

        const sortedWeekdays = [...(values.weekdayIds ?? [])]
          .map((x) => Number.parseInt(String(x), 10))
          .filter((n) => n >= 1 && n <= 7)
          .sort((a, b) => a - b);
        weeklyPreviousSortedRef.current = sortedWeekdays;

        const sortedMonthWeeks = [...(values.monthWeekIds ?? [])]
          .map((x) => Number.parseInt(String(x), 10))
          .filter((n) => n >= 1 && n <= 5)
          .sort((a, b) => a - b);
        monthlyPreviousSortedRef.current = sortedMonthWeeks;

        const sortedYearMonths = [...(values.yearMonthIds ?? [])]
          .map((x) => Number.parseInt(String(x), 10))
          .filter((n) => n >= 1 && n <= 12)
          .sort((a, b) => a - b);
        annualPreviousSortedRef.current = sortedYearMonths;
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        if (!cancelled) setCenterTaskDetailLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, mode, isTrackerCenter, editingTaskName, duplicateFromTaskName, reset]);

  useEffect(() => {
    if (!open || mode !== 'edit' || !isTrackerSettings || !editingDocumentName) return;
    dispatch(clearTaskDetail());
    dispatch(fetchTaskDetailThunk(editingDocumentName));
  }, [open, mode, isTrackerSettings, editingDocumentName, dispatch]);

  useEffect(() => {
    if (!open || mode !== 'edit' || !isTrackerSettings || !taskDetails || taskDetailLoading) {
      return;
    }
    const matchesDocument =
      !editingDocumentName ||
      taskDetails.name === editingDocumentName ||
      taskDetails.task_name === editingDocumentName;
    if (!matchesDocument) return;

    const detailDocKey = String(taskDetails.name ?? editingDocumentName ?? '').trim();
    if (!detailDocKey || syncedTaskDetailDocRef.current === detailDocKey) return;
    syncedTaskDetailDocRef.current = detailDocKey;

    const normalized = normalizeChecklistFromApi(taskDetails.checklists);
    const roleFromDoc = assigneeRoleFromTrackerSettingsAssignees(taskDetails.assignees);
    const roleFromInitial =
      initialValues?.assigneeRole ??
      assigneeRoleFromTrackerSettingsAssignees(initialValues?.assignees) ??
      '';
    const assigneeRole = roleFromDoc || roleFromInitial || getValues('assigneeRole') || '';
    reset(
      {
        taskTitle: taskDetails.task_name ?? taskDetails.name ?? '',
        assigneeRole,
        description: taskDetails.description ?? '',
        checklists: normalized,
      },
      { keepDirtyValues: true },
    );
    setIsDescriptionOpen(Boolean(String(taskDetails.description ?? '').trim()));
    setBaseline(
      JSON.stringify({
        taskTitle: taskDetails.task_name ?? taskDetails.name ?? '',
        assigneeRole,
        description: taskDetails.description ?? '',
        checklists: normalized.map((c) => ({
          name: c?.name,
          checklist_title: String(c?.checklist_title ?? '').trim(),
          disabled: Number(c?.disabled) ? 1 : 0,
        })),
      }),
    );
  }, [
    open,
    mode,
    isTrackerSettings,
    taskDetails,
    taskDetailLoading,
    editingDocumentName,
    reset,
    getValues,
  ]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const refetchCenterTaskPhotosOnly = useCallback(async () => {
    if (!editingTaskName) return;
    const response = await apiClient.get(
      '/method/devx.tracker.api.api_center_tracker_task.get_center_tracker_task_detail',
      { params: { name: editingTaskName } },
    );
    const message = response?.data?.message ?? response?.data;
    if (!message) return;
    setCenterTaskServerPhotos(normalizeCenterTaskPhotosForPreview(message.photos));
  }, [editingTaskName]);

  const handleRemoveCenterTaskPhoto = useCallback(
    async (attachmentId, childRowId) => {
      const photoId = childRowId || attachmentId;
      if (!editingTaskName || !photoId) return;
      setIsCenterTaskPhotoUploading(true);
      try {
        await removeCenterTrackerTaskPhotoApi(editingTaskName, String(photoId));
        showSuccessToast('Photo removed');
        await refetchCenterTaskPhotosOnly();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsCenterTaskPhotoUploading(false);
      }
    },
    [editingTaskName, refetchCenterTaskPhotosOnly],
  );

  const handleFileUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      setFileError(null);
      const validFiles = [];
      const invalidFiles = [];

      [...files].forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push(file.name);
        } else {
          validFiles.push({
            id: Date.now() + Math.random(),
            file,
            name: file.name,
            fileName: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date(),
            createdAt: new Date(),
          });
        }
      });

      if (invalidFiles.length > 0) {
        setFileError(`The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`);
      }

      if (validFiles.length === 0) return;

      if (isTrackerCenter && mode === 'edit' && editingTaskName) {
        setIsCenterTaskPhotoUploading(true);
        try {
          await uploadCenterTrackerTaskPhotos(editingTaskName, validFiles);
          showSuccessToast('Photos uploaded');
          await refetchCenterTaskPhotosOnly();
        } catch (error) {
          showErrorToast(extractErrorMessage(error));
        } finally {
          setIsCenterTaskPhotoUploading(false);
        }
        return;
      }

      setAttachments((previous) => [...previous, ...validFiles]);
    },
    [MAX_FILE_SIZE, isTrackerCenter, mode, editingTaskName, refetchCenterTaskPhotosOnly],
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  const removeAttachment = useCallback((id) => {
    setAttachments((previous) => previous.filter((file) => file.id !== id));
  }, []);

  const handleClose = () => {
    if (isTrackerSettings) {
      dispatch(clearTaskDetail());
    }
    reset(
      isTrackerSettings
        ? settingsDefaultValues
        : isTrackerCenter
          ? trackerCenterDefaultValues
          : taskDefaultValues,
    );
    setIsDescriptionOpen(false);
    setAttachments([]);
    setCenterTaskServerPhotos([]);
    setIsCenterTaskPhotoUploading(false);
    setDragActive(false);
    setFileError(null);
    setIsLayoutPanelOpen(false);
    setLayoutFloorKey('');
    setMarkerCoordinatesByFloorKey({});
    setFloorRowMetaByFloorKey({});
    setIsLayoutMarkerEditMode(false);
    onClose();
  };

  const discardAndClose = () => {
    // Discard changes and close (Cancel button behavior).
    // If we have baseline, re-fetch (for edit) to ensure latest server state on next open.
    if (isTrackerSettings && mode === 'edit' && editingDocumentName) {
      dispatch(fetchTaskDetailThunk(editingDocumentName));
    }
    handleClose();
  };

  const attemptClose = () => {
    discardAndClose();
  };

  const onFormSubmit = async (data) => {
    const normalizedChecklists = (data.checklists ?? [])
      .map((c) => ({
        name: c?.name,
        checklist_title: String(c?.checklist_title ?? '').trim(),
        disabled: Number(c?.disabled) ? 1 : 0,
      }))
      .filter((c) => c.checklist_title.length > 0 || c.name);

    if (isTrackerCenter && mode === 'edit' && editingTaskName) {
      if (!centerId || !trackerName || !viewType) {
        showErrorToast('Missing center or tracker information.');
        return;
      }
      setIsCenterTaskSaving(true);
      try {
        const payload = buildCenterTrackerTaskPayload({
          data,
          trackerName,
          viewType,
          centerId,
          isDaily: isDailyView,
          isWeekly: isWeeklyView,
          isMonthly: isMonthlyView,
          isAnnually: isAnnuallyView,
          markerCoordinatesByFloorKey,
          layoutBundleFloors,
          floorRowMetaByFloorKey,
          assigneeOptions: mergedCenterAssigneeOptions,
        });
        await apiClient.put(
          `/resource/Center Tracker Task/${encodeURIComponent(editingTaskName)}`,
          payload,
        );
        showSuccessToast('Task updated successfully');
        setMarkerCoordinatesByFloorKey({});
        setFloorRowMetaByFloorKey({});
        setIsLayoutMarkerEditMode(false);
        try {
          await onSubmit?.({ ...data, updated: true });
        } catch {
          // Parent refresh is best-effort
        }
        handleClose();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsCenterTaskSaving(false);
      }
      return;
    }

    if (isTrackerCenter && mode === 'create') {
      if (!centerId || !trackerName || !viewType) {
        showErrorToast('Missing center or tracker information.');
        return;
      }
      setIsCenterTaskSaving(true);
      try {
        const payload = buildCenterTrackerTaskPayload({
          data,
          trackerName,
          viewType,
          centerId,
          isDaily: isDailyView,
          isWeekly: isWeeklyView,
          isMonthly: isMonthlyView,
          isAnnually: isAnnuallyView,
          markerCoordinatesByFloorKey,
          layoutBundleFloors,
          floorRowMetaByFloorKey,
          assigneeOptions: mergedCenterAssigneeOptions,
        });
        const createResponse = await apiClient.post('/resource/Center Tracker Task', payload);
        const createdTaskName = extractCreatedResourceName(createResponse);
        showSuccessToast('Task created successfully');
        setMarkerCoordinatesByFloorKey({});

        const hasPhotoFiles = (attachments ?? []).some((a) => a?.file instanceof File);
        if (hasPhotoFiles) {
          if (createdTaskName) {
            try {
              await uploadCenterTrackerTaskPhotos(createdTaskName, attachments);
            } catch (photoError) {
              showErrorToast(extractErrorMessage(photoError) || 'Photos failed to upload.');
            }
          } else {
            showErrorToast(
              'Photos were not uploaded (could not read new task id). You can add them when editing the task.',
            );
          }
        }
        try {
          await onSubmit?.({ ...data, created: true, taskName: createdTaskName });
        } catch {
          // Parent refresh is best-effort
        }
        handleClose();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsCenterTaskSaving(false);
      }
      return;
    }

    // Tracker Settings Edit Mode: update task directly from drawer as requested.
    if (isTrackerSettings && mode === 'edit') {
      const taskTitleForApi = String(editingDocumentName || data.taskTitle || '').trim();
      if (!taskTitleForApi) {
        showErrorToast('Task title is missing.');
        return;
      }

      const roleName = String(data.assigneeRole ?? '').trim();
      const newTaskName = normalizeTrackerDisplayName(data.taskTitle);
      // Don't include task_name in PUT — Frappe silently ignores updates to the
      // naming field. We call frappe.client.rename_doc separately below.
      const payload = {
        description: data.description ?? '',
        checklists: normalizedChecklists.map((c) =>
          c?.name
            ? { name: c.name, checklist_title: c.checklist_title, disabled: c.disabled }
            : { checklist_title: c.checklist_title, disabled: c.disabled },
        ),
        assignees: [{ assignee_type: 'Role', assignee: roleName }],
      };

      try {
        await apiClient.put(
          `/resource/Tracker Task Master/${encodeURIComponent(taskTitleForApi)}`,
          payload,
        );

        // Rename the document if the task name changed.
        // Frappe's naming field (field:task_name) is read-only via REST PUT,
        // so we must use the dedicated rename API which updates the PK and
        // cascades to all Link field references.
        let finalName = taskTitleForApi;
        if (newTaskName && newTaskName !== taskTitleForApi) {
          await apiClient.post('/method/frappe.client.rename_doc', {
            doctype: 'Tracker Task Master',
            old_name: taskTitleForApi,
            new_name: newTaskName,
          });
          finalName = newTaskName;
        }

        showSuccessToast('Task Updated Successfully');
        await dispatch(fetchTaskDetailThunk(finalName));
        try {
          await onSubmit?.({
            ...data,
            checklistItems: normalizedChecklists.map((c) => c.checklist_title).filter(Boolean),
            checklists: normalizedChecklists,
            attachments,
          });
        } catch {
          // Ignore parent updates if they fail; server update already succeeded.
        }
        handleClose();
        return;
      } catch (error) {
        showErrorToast(error);
        return;
      }
    }

    // Other modes: keep existing parent-driven submit flow.
    const cleanedChecklistItems = normalizedChecklists
      .map((c) => c.checklist_title)
      .filter(Boolean);

    try {
      const result = await onSubmit?.({
        ...data,
        checklistItems: cleanedChecklistItems,
        checklists: normalizedChecklists,
        attachments,
      });
      if (result === false) {
        return;
      }
      handleClose();
    } catch {
      // Keep drawer open if parent submit handler fails.
    }
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) attemptClose();
      }}
    >
      <Drawer.Content
        className={cn(
          'relative flex h-full flex-col overflow-hidden',
          isTrackerCenter && isLayoutPanelOpen
            ? '!max-w-[min(100vw,1200px)] w-[min(100vw,1200px)]'
            : 'max-w-[560px]',
        )}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className='absolute inset-0 z-50 bg-information-lighter/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-information-base rounded-lg pointer-events-none'>
            <div className='flex flex-col items-center gap-4'>
              <RiUploadCloud2Line className='size-16 text-information-base' />
              <div className='flex flex-col items-center gap-2'>
                <p className='label-large text-information-base font-semibold'>Drop files here</p>
                <p className='text-paragraph-sm text-text-sub-600'>
                  All file types, up to 10 MB per file
                </p>
              </div>
            </div>
          </div>
        )}
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiFileList2Line size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>
                {mode === 'edit' ? 'Edit Task' : isDuplicatingCenterTask ? 'Copy task' : 'Add Task'}
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                {mode === 'edit'
                  ? 'Update the details below to edit this task.'
                  : isDuplicatingCenterTask
                    ? 'Review the duplicated details, adjust the task name if needed, then create.'
                    : 'Add below details to create a task.'}
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className='flex min-h-0 flex-1 flex-col overflow-hidden'
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 overflow-hidden',
              isTrackerCenter && isLayoutPanelOpen && 'flex-row',
            )}
          >
            <Drawer.Body
              className={cn(
                'relative flex-1 overflow-y-auto px-6 pb-6 pt-4',
                isTrackerCenter && isLayoutPanelOpen && 'min-w-0 max-w-[560px] shrink-0',
              )}
            >
              {centerTaskBlockingLoad && (
                <div className='absolute inset-0 z-[5] flex items-center justify-center bg-bg-white-0/80'>
                  <span className='paragraph-small text-text-sub-600'>Loading task…</span>
                </div>
              )}
              <div
                className={cn(
                  'flex flex-col gap-5',
                  centerTaskBlockingLoad && 'pointer-events-none opacity-50',
                )}
              >
                <>
                  {isTrackerSettings && mode === 'edit' && taskDetailLoading && !taskDetails && (
                    <p className='paragraph-small text-text-sub-600'>Loading task details...</p>
                  )}
                  {/* {isTrackerSettings && mode === 'edit' && taskDetails && (
                  <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3 space-y-1.5'>
                    <p className='label-xsmall text-text-sub-500 uppercase tracking-wide'>
                      Record details
                    </p>
                    <div className='paragraph-xsmall text-text-sub-600 space-y-1'>
                      <div>
                        <span className='text-text-soft-400'>Tracker · </span>
                        {taskDetails.tracker ?? '—'}
                      </div>
                      <div>
                        <span className='text-text-soft-400'>Document · </span>
                        {taskDetails.name ?? '—'}
                      </div>
                      <div>
                        <span className='text-text-soft-400'>Owner · </span>
                        {taskDetails.owner ?? '—'}
                      </div>
                      <div>
                        <span className='text-text-soft-400'>Modified · </span>
                        {taskDetails.modified ?? '—'}
                      </div>
                    </div>
                  </div>
                )} */}
                  {/* Task Title */}
                  <div className='flex flex-col gap-4'>
                    {isTrackerCenter && (mode === 'create' || mode === 'edit') && (
                      <div className='flex flex-col gap-2'>
                        <label
                          htmlFor='trackerTaskMasterTemplate'
                          className='mb-1 block label-small text-text-main-900'
                        >
                          Tracker task template
                        </label>
                        <Controller
                          name='trackerTaskMasterTemplate'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={toSelectStringValue(field.value)}
                              onValueChange={(v) => {
                                field.onChange(v);
                                const trimmed = String(v ?? '').trim();
                                if (!trimmed) {
                                  setValue('masterTaskName', '', {
                                    shouldDirty: true,
                                    shouldValidate: false,
                                  });
                                } else {
                                  const list = trackerTaskMasterListState?.results ?? [];
                                  const picked = list.find(
                                    (r) => String(r?.name ?? r?.task_id ?? '').trim() === trimmed,
                                  );
                                  if (picked) {
                                    setValue(
                                      'masterTaskName',
                                      String(picked.task_name ?? picked.name ?? '').trim(),
                                      { shouldDirty: true, shouldValidate: false },
                                    );
                                  }
                                }
                                if (mode === 'create') {
                                  handleTrackerTaskMasterTemplateChange(v);
                                }
                              }}
                              disabled={
                                mode === 'edit' ||
                                trackerTaskMasterListState.isLoading ||
                                isSubmitting ||
                                isCenterTaskSaving ||
                                centerTaskBlockingLoad
                              }
                              options={(trackerTaskMasterListState.results ?? [])
                                .map((row) => ({
                                  value: row?.name ?? row?.task_id ?? '',
                                  label: row?.task_name ?? row?.name ?? row?.task_id ?? '',
                                }))
                                .filter((o) => o.value)}
                              placeholder={
                                trackerTaskMasterListState.isLoading
                                  ? 'Loading templates…'
                                  : 'Select template (optional)'
                              }
                              showArrow={true}
                            />
                          )}
                        />
                        {mode === 'create' ? (
                          <p className='paragraph-xsmall text-text-soft-400'>
                            Fills title, description, checklists, role, and assignees from Tracker
                            Task Master. Set schedule and floors here.
                          </p>
                        ) : (
                          <p className='paragraph-xsmall text-text-soft-400'>
                            Changing the template updates the template link and display name only;
                            your task title, schedule, floors, and assignees stay as you set them.
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor='taskTitle'
                        className='mb-1 block label-small text-text-main-900'
                      >
                        Task title
                        <span className='shrink-0 text-neutral-400' aria-hidden>
                          *
                        </span>
                      </label>
                      <Controller
                        name='taskTitle'
                        control={control}
                        render={({ field }) => (
                          <Textarea.Root
                            {...field}
                            id='taskTitle'
                            hasError={isSubmitted && Boolean(errors.taskTitle)}
                            placeholder='Enter task title'
                            className='field-sizing-content text-lg'
                            simple
                          />
                        )}
                      />
                      {isSubmitted && errors.taskTitle && (
                        <ErrorText>{errors.taskTitle.message}</ErrorText>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      {isDescriptionOpen ? (
                        <Controller
                          name='description'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              {...field}
                              rows={4}
                              placeholder='Add description'
                              maxLength={200}
                              className='min-h-[116px]'
                            >
                              <Textarea.CharCounter
                                current={field.value?.length || 0}
                                max={200}
                                className='text-text-sub-500'
                              />
                            </Textarea.Root>
                          )}
                        />
                      ) : (
                        <button
                          type='button'
                          onClick={() => setIsDescriptionOpen(true)}
                          className='flex gap-1 w-full items-center border border-transparent hover:border-stroke-sub-300 cursor-pointer px-2 py-1.5 rounded-10'
                        >
                          <RiStickyNoteLine className='size-5 text-text-soft-400' />
                          <span className='text-paragraph-md text-text-soft-400'>
                            Add description
                          </span>
                        </button>
                      )}
                      {isSubmitted && errors.description && (
                        <ErrorText>{errors.description.message}</ErrorText>
                      )}
                    </div>

                    {isTrackerSettings && (
                      <div className='w-full flex flex-col gap-2'>
                        <Label.Root>
                          Role
                          <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          name='assigneeRole'
                          control={control}
                          render={({ field }) => (
                            <SupportRolesSelect
                              id='assigneeRole'
                              value={field.value ?? ''}
                              onValueChange={field.onChange}
                              hasError={isSubmitted && Boolean(errors.assigneeRole)}
                              disabled={isSubmitting}
                              onLoadingChange={setSettingsSupportRolesLoading}
                            />
                          )}
                        />
                        {isSubmitted && errors.assigneeRole && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiErrorWarningFill} />
                            {errors.assigneeRole.message}
                          </Hint.Root>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Details (field/value pairs like task-view-drawer-common) */}
                  {isTrackerSettings ? null : (
                    <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                      <FieldRow icon={RiStackLine} label='Floor' required>
                        <>
                          {isTrackerCenter ? (
                            <div className='flex w-full min-w-0 items-center gap-1'>
                              <div className='min-w-0 flex-1'>
                                <Controller
                                  name='floor'
                                  control={control}
                                  render={({ field }) => (
                                    <SearchableSelect
                                      variant='borderless'
                                      size='xsmall'
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      options={(floorByCenter ?? []).map((opt) => ({
                                        value: opt.floor,
                                        label: opt.floor,
                                      }))}
                                      placeholder='Select floor'
                                      showArrow={false}
                                      triggerClassName={cn(
                                        'w-full',
                                        isSubmitted &&
                                          errors.floor &&
                                          'ring-1 ring-error-base rounded-lg',
                                      )}
                                    />
                                  )}
                                />
                              </div>
                              <CompactButton.Root
                                type='button'
                                variant='stroke'
                                size='large'
                                aria-label='View floor layout'
                                title='View floor layout'
                                disabled={
                                  !watchedFloor ||
                                  isSubmitting ||
                                  isCenterTaskSaving ||
                                  centerTaskBlockingLoad
                                }
                                onClick={() => setIsLayoutPanelOpen(true)}
                                className='shrink-0'
                              >
                                <CompactButton.Icon as={RiLayoutMasonryLine} />
                              </CompactButton.Root>
                            </div>
                          ) : (
                            <Controller
                              name='floor'
                              control={control}
                              render={({ field }) => (
                                <SearchableSelect
                                  variant='borderless'
                                  size='xsmall'
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  options={(floorByCenter ?? []).map((opt) => ({
                                    value: opt.floor,
                                    label: opt.floor,
                                  }))}
                                  placeholder='Select'
                                  showArrow={false}
                                  triggerClassName={cn(
                                    isSubmitted &&
                                      errors.floor &&
                                      'ring-1 ring-error-base rounded-lg',
                                  )}
                                />
                              )}
                            />
                          )}
                          {isSubmitted && errors.floors?.message && (
                            <ErrorText>{errors.floors.message}</ErrorText>
                          )}
                          {isSubmitted && errors.floor?.message && (
                            <ErrorText>{errors.floor.message}</ErrorText>
                          )}
                        </>
                      </FieldRow>

                      <FieldRow icon={RiUserLine} label='Assignee' required>
                        <>
                          {isTrackerCenter ? (
                            <Controller
                              name='assigneeIds'
                              control={control}
                              render={({ field }) => {
                                const ids = Array.isArray(field.value) ? field.value : [];
                                const mergedOptions = (() => {
                                  const opts = mergedCenterAssigneeOptions.map((o) => ({ ...o }));
                                  const seen = new Set(opts.map((o) => String(o.value)));
                                  ids.forEach((id) => {
                                    const s = String(id ?? '').trim();
                                    if (s && !seen.has(s)) {
                                      seen.add(s);
                                      opts.unshift({
                                        value: s,
                                        label: s,
                                        user_role: assigneeRoleNameWatch || 'Team member',
                                      });
                                    }
                                  });
                                  return opts;
                                })();
                                return (
                                  <SupervisorAssigneeMultiSelect
                                    options={mergedOptions}
                                    value={ids}
                                    size='xsmall'
                                    variant='borderless'
                                    placeholder='Select assignees'
                                    maxVisibleAvatars={4}
                                    hasError={isSubmitted && Boolean(errors.assigneeIds)}
                                    disabled={
                                      isSubmitting || isCenterTaskSaving || centerTaskBlockingLoad
                                    }
                                    roleLabel={assigneeRoleNameWatch || 'Team member'}
                                    onChange={field.onChange}
                                    onBlur={(next) => {
                                      field.onChange(next);
                                      field.onBlur();
                                    }}
                                    triggerClassName='w-full min-w-0 justify-start'
                                  />
                                );
                              }}
                            />
                          ) : (
                            <Controller
                              name='assignee'
                              control={control}
                              render={({ field }) => (
                                <SearchableSelect
                                  variant='borderless'
                                  size='xsmall'
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  options={assigneeOptions}
                                  placeholder='Select'
                                  showArrow={false}
                                  triggerClassName={cn(
                                    isSubmitted &&
                                      errors.assignee &&
                                      'ring-1 ring-error-base rounded-lg',
                                  )}
                                />
                              )}
                            />
                          )}
                          {isSubmitted && errors.assigneeIds && (
                            <ErrorText>
                              {typeof errors.assigneeIds.message === 'string'
                                ? errors.assigneeIds.message
                                : 'Invalid assignees'}
                            </ErrorText>
                          )}
                          {isSubmitted && errors.assignee?.message && (
                            <ErrorText>{errors.assignee.message}</ErrorText>
                          )}
                        </>
                      </FieldRow>

                      {isTrackerCenter && isDailyView ? (
                        <>
                          <FieldRow icon={RiCalendarLine} label='Frequency' required>
                            <>
                              <Controller
                                name='frequencyCount'
                                control={control}
                                render={({ field }) => (
                                  <Select.Root
                                    variant='borderless'
                                    size='xsmall'
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <Select.Trigger
                                      className={cn(
                                        'w-full',
                                        isSubmitted &&
                                          errors.frequencyCount &&
                                          'ring-1 ring-error-base rounded-lg',
                                      )}
                                      showArrow={false}
                                    >
                                      <Select.Value placeholder='Select' />
                                    </Select.Trigger>
                                    <Select.Content>
                                      {Array.from({ length: 48 }, (_, i) => String(i + 1)).map(
                                        (v) => (
                                          <Select.Item key={v} value={v}>
                                            {v}
                                          </Select.Item>
                                        ),
                                      )}
                                    </Select.Content>
                                  </Select.Root>
                                )}
                              />
                              {isSubmitted && errors.frequencyCount?.message && (
                                <ErrorText>{errors.frequencyCount.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                          <FieldRow icon={RiTimeLine} label='Start – End Time' required>
                            <>
                              <Popover.Root>
                                <Popover.Trigger asChild>
                                  <button
                                    type='button'
                                    className={cn(
                                      'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                                      isSubmitted && errors.schedule
                                        ? 'border-error-base'
                                        : 'border-stroke-soft-200 hover:bg-bg-weak-50',
                                    )}
                                  >
                                    {dailyTimeSlotBadges.length === 0 ? (
                                      <span className='label-small text-text-soft-400'>
                                        Select time
                                      </span>
                                    ) : (
                                      <span className='flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden'>
                                        <span className='inline-flex min-w-0 items-center truncate rounded-full border border-stroke-soft-200 bg-bg-weak-50 px-2 py-0.5 label-small text-text-main-900'>
                                          {dailyTimeSlotBadges[0].text}
                                        </span>
                                        {dailyTimeSlotBadges.length > 1 && (
                                          <span className='inline-flex shrink-0 items-center rounded-full border border-stroke-soft-200 bg-bg-weak-50 px-2 py-0.5 label-small text-text-sub-600'>
                                            +{dailyTimeSlotBadges.length - 1}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
                                  </button>
                                </Popover.Trigger>
                                <Popover.Content
                                  align='start'
                                  className='w-[min(calc(100vw-3rem),380px)] p-4'
                                  side='bottom'
                                  sideOffset={8}
                                >
                                  <div className='flex max-h-[min(50vh,400px)] flex-col gap-4 overflow-y-auto pr-1'>
                                    {scheduleFields.map((sf, index) => (
                                      <div key={sf.id} className='flex flex-col gap-2'>
                                        <span className='label-small text-text-main-900'>
                                          Start Time {index + 1} – End Time {index + 1}
                                        </span>
                                        <div className='flex min-w-0 items-center gap-2'>
                                          <Controller
                                            name={`schedule.${index}.start_time`}
                                            control={control}
                                            render={({ field }) => (
                                              <ScheduleTimeSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder='Start'
                                                itemKeyPrefix={`d-start-${index}`}
                                                options={startTimeOptions}
                                              />
                                            )}
                                          />
                                          <span
                                            className='shrink-0 paragraph-small text-text-soft-400'
                                            aria-hidden
                                          >
                                            –
                                          </span>
                                          <Controller
                                            name={`schedule.${index}.end_time`}
                                            control={control}
                                            render={({ field }) => (
                                              <ScheduleTimeSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder='End'
                                                itemKeyPrefix={`d-end-${index}`}
                                                options={startTimeOptions}
                                              />
                                            )}
                                          />
                                        </div>
                                        {isSubmitted &&
                                          (errors.schedule?.[index]?.end_time?.message ||
                                            errors.schedule?.[index]?.start_time?.message) && (
                                            <ErrorText>
                                              {errors.schedule?.[index]?.end_time?.message ||
                                                errors.schedule?.[index]?.start_time?.message}
                                            </ErrorText>
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                </Popover.Content>
                              </Popover.Root>
                              {isSubmitted && errors.schedule?.message && (
                                <ErrorText>{errors.schedule.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                        </>
                      ) : isTrackerCenter && isWeeklyView ? (
                        <>
                          <FieldRow icon={RiCalendarLine} label='Frequency' required>
                            <>
                              <Controller
                                name='weekdayIds'
                                control={control}
                                render={({ field }) => (
                                  <MultiSelect
                                    options={WEEKDAY_OPTIONS}
                                    value={Array.isArray(field.value) ? field.value : []}
                                    onValueChange={(vals) => {
                                      const sorted = [
                                        ...new Set((vals ?? []).map((v) => String(v))),
                                      ]
                                        .map((v) => Number.parseInt(v, 10))
                                        .filter((n) => n >= 1 && n <= 7)
                                        .sort((a, b) => a - b)
                                        .map(String);
                                      field.onChange(sorted);
                                    }}
                                    placeholder='Select days'
                                    size='small'
                                    variant='borderless'
                                    className='w-full'
                                    maxDisplayItems={3}
                                    enableSearch={false}
                                    hasError={isSubmitted && Boolean(errors.weekdayIds)}
                                  />
                                )}
                              />
                              {isSubmitted && errors.weekdayIds?.message && (
                                <ErrorText>{errors.weekdayIds.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                          <FieldRow icon={RiTimeLine} label='Start – End Time'>
                            <>
                              <Popover.Root>
                                <Popover.Trigger asChild>
                                  <button
                                    type='button'
                                    className={cn(
                                      'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                                      isSubmitted && errors.schedule
                                        ? 'border-error-base'
                                        : 'border-stroke-soft-200 hover:bg-bg-weak-50',
                                    )}
                                  >
                                    <span
                                      className={
                                        weeklyTimePopoverSummary === 'Select time'
                                          ? 'label-small text-text-soft-400'
                                          : 'label-small text-text-main-900'
                                      }
                                    >
                                      {weeklyTimePopoverSummary}
                                    </span>
                                    <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
                                  </button>
                                </Popover.Trigger>
                                <Popover.Content
                                  align='start'
                                  className='w-[min(calc(100vw-3rem),380px)] p-4'
                                  side='bottom'
                                  sideOffset={8}
                                >
                                  <div className='flex max-h-[min(50vh,400px)] flex-col gap-4 overflow-y-auto pr-1'>
                                    {scheduleFields.map((sf, index) => {
                                      const dayValue = Array.isArray(weekdayIdsWatch)
                                        ? weekdayIdsWatch[index]
                                        : undefined;
                                      const dayLabel =
                                        WEEKDAY_OPTIONS.find((o) => o.value === String(dayValue))
                                          ?.label ?? `Day ${index + 1}`;
                                      return (
                                        <div key={sf.id} className='flex flex-col gap-2'>
                                          <span className='label-small text-text-main-900'>
                                            {dayLabel}: Start – End Time
                                            <span className='font-normal text-text-soft-400'>
                                              {' '}
                                              (end optional)
                                            </span>
                                          </span>
                                          <div className='flex min-w-0 items-center gap-2'>
                                            <Controller
                                              name={`schedule.${index}.start_time`}
                                              control={control}
                                              render={({ field }) => (
                                                <ScheduleTimeSelect
                                                  value={field.value}
                                                  onChange={field.onChange}
                                                  placeholder='Start'
                                                  itemKeyPrefix={`w-start-${index}`}
                                                  options={startTimeOptions}
                                                />
                                              )}
                                            />
                                            <span
                                              className='shrink-0 paragraph-small text-text-soft-400'
                                              aria-hidden
                                            >
                                              –
                                            </span>
                                            <Controller
                                              name={`schedule.${index}.end_time`}
                                              control={control}
                                              render={({ field }) => (
                                                <ScheduleTimeSelect
                                                  value={field.value}
                                                  onChange={field.onChange}
                                                  placeholder='End'
                                                  itemKeyPrefix={`w-end-${index}`}
                                                  options={startTimeOptions}
                                                />
                                              )}
                                            />
                                          </div>
                                          {isSubmitted &&
                                            (errors.schedule?.[index]?.end_time?.message ||
                                              errors.schedule?.[index]?.start_time?.message) && (
                                              <ErrorText>
                                                {errors.schedule?.[index]?.end_time?.message ||
                                                  errors.schedule?.[index]?.start_time?.message}
                                              </ErrorText>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </Popover.Content>
                              </Popover.Root>
                              {isSubmitted && errors.schedule?.message && (
                                <ErrorText>{errors.schedule.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                        </>
                      ) : isTrackerCenter && isMonthlyView ? (
                        <>
                          <FieldRow icon={RiCalendarLine} label='Frequency' required>
                            <>
                              <Controller
                                name='monthWeekIds'
                                control={control}
                                render={({ field }) => (
                                  <MultiSelect
                                    options={MONTH_WEEK_OPTIONS}
                                    value={Array.isArray(field.value) ? field.value : []}
                                    onValueChange={(vals) => {
                                      const sorted = [
                                        ...new Set((vals ?? []).map((v) => String(v))),
                                      ]
                                        .map((v) => Number.parseInt(v, 10))
                                        .filter((n) => n >= 1 && n <= 4)
                                        .sort((a, b) => a - b)
                                        .map(String);
                                      field.onChange(sorted);
                                    }}
                                    placeholder='Select weeks'
                                    size='small'
                                    variant='borderless'
                                    className='w-full'
                                    maxDisplayItems={3}
                                    enableSearch={false}
                                    hasError={isSubmitted && Boolean(errors.monthWeekIds)}
                                  />
                                )}
                              />
                              {isSubmitted && errors.monthWeekIds?.message && (
                                <ErrorText>{errors.monthWeekIds.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                          <FieldRow icon={RiCalendarLine} label='Date'>
                            <>
                              <Popover.Root>
                                <Popover.Trigger asChild>
                                  <button
                                    type='button'
                                    className={cn(
                                      'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                                      isSubmitted && errors.schedule
                                        ? 'border-error-base'
                                        : 'border-stroke-soft-200 hover:bg-bg-weak-50',
                                    )}
                                  >
                                    {!Array.isArray(monthWeekIdsWatch) ||
                                    monthWeekIdsWatch.length === 0 ? (
                                      <span className='label-small text-text-soft-400'>
                                        Select weeks
                                      </span>
                                    ) : monthlyScheduleBadges.length === 0 ? (
                                      <span className='label-small text-text-soft-400'>
                                        Select start date
                                      </span>
                                    ) : (
                                      <span className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
                                        {monthlyScheduleBadges.map(({ key, text }) => (
                                          <span
                                            key={key}
                                            className='inline-flex max-w-full items-center rounded-full border border-stroke-soft-200 bg-bg-weak-50 px-2 py-0.5 label-small text-text-main-900'
                                          >
                                            {text}
                                          </span>
                                        ))}
                                      </span>
                                    )}
                                    <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
                                  </button>
                                </Popover.Trigger>
                                <Popover.Content
                                  align='start'
                                  className='w-[min(calc(100vw-3rem),380px)] p-4'
                                  side='bottom'
                                  sideOffset={8}
                                >
                                  <div className='flex max-h-[min(50vh,400px)] flex-col gap-4 overflow-y-auto pr-1'>
                                    {scheduleFields.map((sf, index) => {
                                      const weekValue = Array.isArray(monthWeekIdsWatch)
                                        ? monthWeekIdsWatch[index]
                                        : undefined;
                                      const weekLabel =
                                        MONTH_WEEK_OPTIONS.find(
                                          (o) => o.value === String(weekValue),
                                        )?.label ?? `Week ${index + 1}`;
                                      return (
                                        <div key={sf.id} className='flex flex-col gap-2'>
                                          <span className='label-small text-text-main-900'>
                                            {weekLabel}: Start – End Date
                                            <span className='font-normal text-text-soft-400'>
                                              {' '}
                                              (end optional)
                                            </span>
                                          </span>
                                          <div className='flex min-w-0 items-center gap-2'>
                                            <Controller
                                              name={`schedule.${index}.start_day`}
                                              control={control}
                                              render={({ field }) => (
                                                <SearchableSelect
                                                  size='medium'
                                                  value={toSelectStringValue(field.value) || ''}
                                                  onValueChange={(v) => field.onChange(String(v))}
                                                  options={MONTH_DAY_NUMERIC_OPTIONS}
                                                  placeholder='Start'
                                                  showArrow={true}
                                                  triggerClassName='min-w-0 flex-1 justify-between rounded-lg border border-stroke-soft-200 px-2.5 py-2'
                                                />
                                              )}
                                            />
                                            <span
                                              className='shrink-0 paragraph-small text-text-soft-400'
                                              aria-hidden
                                            >
                                              –
                                            </span>
                                            <Controller
                                              name={`schedule.${index}.end_day`}
                                              control={control}
                                              render={({ field }) => (
                                                <SearchableSelect
                                                  size='medium'
                                                  value={toSelectStringValue(field.value) || ''}
                                                  onValueChange={field.onChange}
                                                  valueSentinel={MONTH_END_DAY_NONE}
                                                  options={[
                                                    {
                                                      value: MONTH_END_DAY_NONE,
                                                      label: 'No end day',
                                                    },
                                                    ...MONTH_DAY_NUMERIC_OPTIONS,
                                                  ]}
                                                  placeholder='End'
                                                  showArrow={true}
                                                  triggerClassName='min-w-0 flex-1 justify-between rounded-lg border border-stroke-soft-200 px-2.5 py-2'
                                                />
                                              )}
                                            />
                                          </div>
                                          {isSubmitted &&
                                            (errors.schedule?.[index]?.end_day?.message ||
                                              errors.schedule?.[index]?.start_day?.message) && (
                                              <ErrorText>
                                                {errors.schedule?.[index]?.end_day?.message ||
                                                  errors.schedule?.[index]?.start_day?.message}
                                              </ErrorText>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </Popover.Content>
                              </Popover.Root>
                              {isSubmitted && errors.schedule?.message && (
                                <ErrorText>{errors.schedule.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                        </>
                      ) : isTrackerCenter && isAnnuallyView ? (
                        <>
                          <FieldRow icon={RiCalendarLine} label='Frequency' required>
                            <>
                              <Controller
                                name='yearMonthIds'
                                control={control}
                                render={({ field }) => (
                                  <MultiSelect
                                    options={YEAR_MONTH_OPTIONS}
                                    value={Array.isArray(field.value) ? field.value : []}
                                    onValueChange={(vals) => {
                                      const sorted = [
                                        ...new Set((vals ?? []).map((v) => String(v))),
                                      ]
                                        .map((v) => Number.parseInt(v, 10))
                                        .filter((n) => n >= 1 && n <= 12)
                                        .sort((a, b) => a - b)
                                        .map(String);
                                      field.onChange(sorted);
                                    }}
                                    placeholder='Select months'
                                    size='small'
                                    variant='borderless'
                                    className='w-full'
                                    maxDisplayItems={3}
                                    enableSearch={false}
                                    hasError={isSubmitted && Boolean(errors.yearMonthIds)}
                                  />
                                )}
                              />
                              {isSubmitted && errors.yearMonthIds?.message && (
                                <ErrorText>{errors.yearMonthIds.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                        </>
                      ) : isTrackerCenter ? (
                        <>
                          <FieldRow icon={RiCalendarLine} label='Frequency' required>
                            <>
                              <Controller
                                name='frequency'
                                control={control}
                                render={({ field }) => (
                                  <Input.Root variant='borderless' size='xsmall' className='w-full'>
                                    <Input.Wrapper>
                                      <Input.Input
                                        {...field}
                                        placeholder='e.g. 1'
                                        className='text-right'
                                        aria-invalid={
                                          isSubmitted && Boolean(errors.frequency)
                                            ? true
                                            : undefined
                                        }
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                )}
                              />
                              {isSubmitted && errors.frequency?.message && (
                                <ErrorText>{errors.frequency.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                          <FieldRow icon={RiTimeLine} label='Time'>
                            <>
                              <Popover.Root>
                                <Popover.Trigger asChild>
                                  <button
                                    type='button'
                                    className={cn(
                                      'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                                      isSubmitted && (errors.startTime || errors.endTime)
                                        ? 'border-error-base'
                                        : 'border-stroke-soft-200 hover:bg-bg-weak-50',
                                    )}
                                  >
                                    <span
                                      className={
                                        nonDailyTimePopoverSummary === 'Select time'
                                          ? 'label-small text-text-soft-400'
                                          : 'label-small text-text-main-900'
                                      }
                                    >
                                      {nonDailyTimePopoverSummary}
                                    </span>
                                    <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
                                  </button>
                                </Popover.Trigger>
                                <Popover.Content
                                  align='start'
                                  className='w-[min(calc(100vw-3rem),380px)] p-4'
                                  side='bottom'
                                  sideOffset={8}
                                >
                                  {/* <p className='mb-4 text-center label-small font-medium text-text-main-900'>
                                Select Time
                              </p> */}
                                  <div className='flex flex-col gap-2'>
                                    <span className='label-small text-text-main-900'>
                                      Start Time 1 – End Time 1
                                      <span className='font-normal text-text-soft-400'>
                                        {' '}
                                        (end optional)
                                      </span>
                                    </span>
                                    <div className='flex min-w-0 items-center gap-2'>
                                      <Controller
                                        name='startTime'
                                        control={control}
                                        render={({ field }) => (
                                          <ScheduleTimeSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder='Start'
                                            itemKeyPrefix='nd-start'
                                            options={startTimeOptions}
                                          />
                                        )}
                                      />
                                      <span
                                        className='shrink-0 paragraph-small text-text-soft-400'
                                        aria-hidden
                                      >
                                        –
                                      </span>
                                      <Controller
                                        name='endTime'
                                        control={control}
                                        render={({ field }) => (
                                          <ScheduleTimeSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder='End'
                                            itemKeyPrefix='nd-end'
                                            options={startTimeOptions}
                                          />
                                        )}
                                      />
                                    </div>
                                  </div>
                                </Popover.Content>
                              </Popover.Root>
                              {isSubmitted && errors.startTime?.message && (
                                <ErrorText>{errors.startTime.message}</ErrorText>
                              )}
                              {isSubmitted && errors.endTime?.message && (
                                <ErrorText>{errors.endTime.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                        </>
                      ) : (
                        <>
                          <FieldRow icon={RiCalendarLine} label='Frequency' required>
                            <>
                              <Controller
                                name='frequency'
                                control={control}
                                render={({ field }) => (
                                  <SearchableSelect
                                    variant='borderless'
                                    size='xsmall'
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={frequencyOptions}
                                    placeholder='Select'
                                    showArrow={false}
                                    triggerClassName={cn(
                                      'w-full',
                                      isSubmitted &&
                                        errors.frequency &&
                                        'ring-1 ring-error-base rounded-lg',
                                    )}
                                  />
                                )}
                              />
                              {isSubmitted && errors.frequency?.message && (
                                <ErrorText>{errors.frequency.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                          <FieldRow icon={RiTimeLine} label='Start Time'>
                            <>
                              <Controller
                                name='startTime'
                                control={control}
                                render={({ field }) => (
                                  <ScheduleTimeSelect
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder='Select time'
                                    itemKeyPrefix='single-start'
                                    options={startTimeOptions}
                                  />
                                )}
                              />
                              {isSubmitted && errors.startTime?.message && (
                                <ErrorText>{errors.startTime.message}</ErrorText>
                              )}
                            </>
                          </FieldRow>
                        </>
                      )}
                    </div>
                  )}

                  {/* Checklist — required; gray * (FieldRow); error ring on whole row incl. checkbox + delete */}
                  <div className='flex flex-col gap-2'>
                    <div className='w-full flex items-center justify-between gap-2'>
                      <div className='min-w-0 flex flex-1 items-center gap-1 label-small text-text-main-900'>
                        <RiCheckLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
                        <span>
                          Task Checklist
                          <span className='shrink-0 text-neutral-400' aria-hidden>
                            *
                          </span>
                        </span>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Button.Root
                          type='button'
                          variant='neutral'
                          size='xsmall'
                          mode='stroke'
                          className='gap-1'
                        >
                          English
                          <Button.Icon as={RiArrowDownSLine} />
                        </Button.Root>

                        <Button.Root
                          type='button'
                          variant='neutral'
                          className='gap-1'
                          mode='stroke'
                          size='xsmall'
                          onClick={() => append({ checklist_title: '', disabled: 0 })}
                        >
                          <Button.Icon as={RiAddLine} className='size-4' />
                          Add
                        </Button.Root>
                      </div>
                    </div>

                    {fields.map((field, index) => {
                      const checklistTitle = checklistsWatch?.[index]?.checklist_title;
                      const rowEmpty = !String(checklistTitle ?? '').trim();
                      const rowError = Boolean(checklistErrorMessage) && rowEmpty;
                      return (
                        <div
                          key={field.id}
                          className={cn(
                            'w-full flex items-center justify-between py-2 pl-[10px] pr-2 rounded-lg border',
                            rowError ? 'border-error-base' : 'border-stroke-soft-200',
                          )}
                        >
                          <div className='w-full  flex items-center justify-start gap-2'>
                            <Controller
                              name={`checklists.${index}.checklist_title`}
                              control={control}
                              render={({ field: inputField }) => (
                                <>
                                  <Controller
                                    name={`checklists.${index}.disabled`}
                                    control={control}
                                    render={({ field: disabledField }) => (
                                      <Checkbox.Root
                                        checked={Number(disabledField.value) === 0}
                                        onCheckedChange={(next) => {
                                          handleChecklistToggle(index, Boolean(next));
                                        }}
                                      />
                                    )}
                                  />

                                  <Input.Root variant='borderless' size='xsmall' className='w-full'>
                                    <Input.Wrapper>
                                      <Input.Input
                                        {...inputField}
                                        placeholder='Checklist item'
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            append({ checklist_title: '', disabled: 0 });
                                            // Focus the new input field after a brief delay
                                            setTimeout(() => {
                                              const newIndex = fields.length;
                                              const newInput = document.querySelector(
                                                `input[name="checklists.${newIndex}.checklist_title"]`,
                                              );
                                              newInput?.focus();
                                            }, 0);
                                          }
                                        }}
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                </>
                              )}
                            />
                          </div>

                          <CompactButton.Root
                            type='button'
                            variant='neutral'
                            size='xsmall'
                            mode='stroke'
                            className='gap-1 text-[var(--color-text-soft-400)]'
                            onClick={() => handleRemoveChecklistItem(index)}
                          >
                            <CompactButton.Icon as={RiDeleteBinLine} className='size-4' />
                          </CompactButton.Root>
                        </div>
                      );
                    })}
                    {checklistErrorMessage ? <ErrorText>{checklistErrorMessage}</ErrorText> : null}
                  </div>

                  {/* Photos / Attachments — header + list pattern matches ticket-view-drawer */}
                  {!isTrackerSettings && (
                    <div className='flex flex-col gap-2 pb-6'>
                      {isTrackerCenter ? (
                        <div className='flex items-center justify-between gap-3 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2.5'>
                          <div className='min-w-0'>
                            <p className='label-small text-text-main-900'>Is Image Mandatory</p>
                            <p className='paragraph-xsmall text-text-soft-400'>
                              When off, tablet users will not see the photo upload section.
                            </p>
                          </div>
                          <Controller
                            name='isImageMandatory'
                            control={control}
                            render={({ field }) => (
                              <Switch.Root
                                type='button'
                                checked={Boolean(field.value)}
                                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                disabled={isCenterTaskSaving || isCenterTaskPhotoUploading}
                              />
                            )}
                          />
                        </div>
                      ) : null}
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <RiAttachment2 className='size-5 text-text-sub-500' />
                          <span className='label-small text-text-sub-500'>
                            {source === 'tracker-center' ? 'Photos' : 'Attachments'}
                          </span>
                        </div>
                        <input
                          type='file'
                          multiple
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className='hidden'
                          id={fileInputId}
                          accept={source === 'tracker-center' ? 'image/*' : undefined}
                        />
                        <Button.Root
                          type='button'
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                          className='gap-1'
                          onClick={() => document.querySelector(`#${fileInputId}`)?.click()}
                          disabled={
                            isCenterTaskSaving ||
                            isCenterTaskPhotoUploading ||
                            (source === 'tracker-center' && centerTaskBlockingLoad)
                          }
                        >
                          <Button.Icon
                            as={
                              isCenterTaskSaving || isCenterTaskPhotoUploading
                                ? RiUploadCloud2Line
                                : RiUploadLine
                            }
                            className={
                              isCenterTaskSaving || isCenterTaskPhotoUploading
                                ? 'animate-pulse p-0.5'
                                : 'p-0.5'
                            }
                          />
                          <span>
                            {isCenterTaskPhotoUploading
                              ? 'Uploading...'
                              : isCenterTaskSaving
                                ? 'Uploading...'
                                : 'Upload Files'}
                          </span>
                        </Button.Root>
                      </div>
                      {fileError && (
                        <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                          <span className='text-paragraph-xs text-error-base'>{fileError}</span>
                        </div>
                      )}
                      {isTrackerCenter ? (
                        <>
                          {mode === 'edit' && centerTaskServerPhotos.length > 0 && (
                            <AttachmentList
                              attachments={centerTaskServerPhotos}
                              onRemove={handleRemoveCenterTaskPhoto}
                              dangerRemove
                              disabled={isCenterTaskSaving || isCenterTaskPhotoUploading}
                            />
                          )}
                          {mode === 'create' && attachments.length > 0 && (
                            <AttachmentList
                              attachments={attachments}
                              onRemove={removeAttachment}
                              disabled={isCenterTaskSaving}
                            />
                          )}
                        </>
                      ) : (
                        attachments.length > 0 && (
                          <AttachmentList
                            attachments={attachments}
                            onRemove={removeAttachment}
                            disabled={isCenterTaskSaving}
                          />
                        )
                      )}
                    </div>
                  )}
                </>
              </div>
            </Drawer.Body>

            {isTrackerCenter && isLayoutPanelOpen ? (
              <div className='flex min-h-0 min-w-0 flex-1 flex-col border-l border-stroke-soft-200 bg-bg-weak-50'>
                {showLayoutMarkerViewPanel ? (
                  <TrackerCenterViewLayoutPanel
                    key={activeLayoutFloorRef || activeLayoutFloorKey}
                    layoutDetail={activeLayoutDetail}
                    floorRef={activeLayoutFloorRef}
                    floorLabel={activeLayoutFloorKey}
                    markerCoordinate={activeMarkerCoordinate}
                    spaceId={activeMarkerSpaceId}
                    isLoading={layoutBundleLoading}
                    error={layoutBundleError}
                    canEditMarker
                    onUpdateMarker={() => setIsLayoutMarkerEditMode(true)}
                  />
                ) : (
                  <TicketCreateLayoutPanel
                    key={activeLayoutFloorRef || activeLayoutFloorKey}
                    layoutDetail={activeLayoutDetail}
                    floorRef={activeLayoutFloorRef}
                    isLoading={layoutBundleLoading}
                    error={layoutBundleError}
                    onClose={handleLayoutMarkerPanelClose}
                    initialMarkerCoordinate={activeMarkerCoordinate}
                    onMarkerCoordinateChange={handleMarkerCoordinateChange}
                    autoSaveMarker
                  />
                )}
              </div>
            ) : null}
          </div>

          <Drawer.Footer className='sticky bottom-0 z-10 bg-white border-t border-stroke-soft-200'>
            <div className='flex flex-col gap-3 p-6 sm:flex-row sm:justify-end'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='w-full sm:w-auto'
                onClick={discardAndClose}
                disabled={
                  isSubmitting ||
                  isCenterTaskSaving ||
                  isCenterTaskPhotoUploading ||
                  (isTrackerSettings && settingsSupportRolesLoading) ||
                  centerTaskBlockingLoad
                }
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='submit'
                className='w-full sm:w-auto'
                size='xsmall'
                disabled={
                  isSubmitting ||
                  isCenterTaskSaving ||
                  isCenterTaskPhotoUploading ||
                  (isTrackerSettings && settingsSupportRolesLoading) ||
                  centerTaskBlockingLoad
                }
              >
                {isSubmitting || isCenterTaskSaving
                  ? 'Loading...'
                  : mode === 'edit'
                    ? 'Save'
                    : 'Create'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateTrackerTaskDrawer;
