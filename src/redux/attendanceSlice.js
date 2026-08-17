import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { attendanceDateFormat } from '@/utils/date-utils';

/** Format mobile for create-employee API: +91-9601705078 */
const formatCellNumber = (mobile) => {
  if (!mobile || typeof mobile !== 'string') return '+91-';
  const digits = mobile.replaceAll(/\D/g, '').replace(/^91/, '');
  return `+91-${digits || ''}`;
};

/** Build create-employee API payload from form data. Used for New Staff / New Trainee / Reliever. */
const buildCreateEmployeePayload = (formData) => {
  const staffType = formData?.staffType;
  const employmentType = formData?.employmentType;

  const resolvedStaffType =
    staffType ??
    (employmentType === 'Reliever Staff'
      ? 'RELIEVER'
      : employmentType === 'Trainee Staff'
        ? 'NEW_TRAINEE'
        : null);

  const isReliever = resolvedStaffType === 'RELIEVER';
  const isNew = resolvedStaffType === 'NEW' || resolvedStaffType === 'NEW_TRAINEE';

  return {
    centers: formData.centerId ?? formData.selectedCenter,
    role: formData.role,
    aadhaar_number: formData.aadharNumber ?? formData.newAadhar,
    first_name: formData.firstName ?? formData.newFirstName,
    last_name: formData.lastName ?? formData.newLastName,
    cell_number: formatCellNumber(formData.mobileNumber ?? formData.newPhone),
    status: 'Active',
    shift: formData.shift,
    ...(isReliever
      ? {
          employment_type: 'Reliever Staff',
          custom_replacing_employee:
            formData?.employee_id ??
            formData?.employeeId ??
            formData?.relievedStaffId ??
            formData?.customReplacingEmployee ??
            null,
        }
      : {}),
    ...(isNew ? { employment_type: 'Trainee Staff' } : {}),
  };
};

const hygieneFormatHelper = (checklist) => {
  const hygieneFormat = checklist?.map((item) => {
    return {
      check_item: item?.label,
      status: item?.status,
      remarks: '',
    };
  });
  return hygieneFormat;
};

const buildPayload = (payload) => {
  if (payload.staffType === 'CURRENT') {
    const status = payload?.currentStaff?.attendanceStatus ?? 'Present';
    const base = {
      employee_id: payload?.currentStaff?.currentStaffId,
      status,
      attendance_date: attendanceDateFormat(payload?.dateTime),
      comment: payload?.comment || '',
      employment_type: payload?.employmentType ?? null,
      shift: payload?.shift,
      center: payload?.center ?? payload?.selectedCenter ?? payload?.centerId,
    };
    if (status === 'Absent') {
      return base;
    }
    return {
      ...base,
      hygiene_inspection: hygieneFormatHelper(payload?.currentStaff?.checklist),
    };
  }
  if (payload.staffType === 'RELIEVER') {
    return {
      employee_id: payload?.reliever?.employeeId ?? payload?.reliever?.relievedStaffId,
      status: 'Present',
      attendance_date: attendanceDateFormat(payload?.dateTime),
      comment: payload?.comment || '',
      employment_type: payload?.employmentType ?? 'Reliever Staff',
      custom_replacing_employee: payload?.customReplacingEmployee ?? null,
      hygiene_inspection: hygieneFormatHelper(payload?.reliever?.checklist),
      shift: payload?.shift,
      center: payload?.center ?? payload?.selectedCenter ?? payload?.centerId,
    };
  }
  if (payload.staffType === 'NEW' || payload.staffType === 'NEW_TRAINEE') {
    // After create-employee, we have employee_id; submit attendance with checklist only
    const employeeId = payload?.newStaff?.employeeId;
    if (!employeeId) return null;
    return {
      employee_id: employeeId,
      status: 'Present',
      attendance_date: attendanceDateFormat(payload?.dateTime),
      comment: payload?.comment || '',
      employment_type:
        payload?.employmentType ?? (payload.staffType === 'NEW_TRAINEE' ? 'Trainee Staff' : null),
      hygiene_inspection: hygieneFormatHelper(payload?.newStaff?.checklist),
      shift: payload?.shift,
      center: payload?.center ?? payload?.selectedCenter ?? payload?.centerId,
    };
  }
  return null;
};

export const getPublicCenterListThunk = createAsyncThunk(
  'attendance/getPublicCenterList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.user.public_get_active_centers');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getEmployeeListThunk = createAsyncThunk(
  'attendance/getEmployeeList',
  async (centerId, { rejectWithValue }) => {
    try {
      // console.log('centerId', centerId);
      const response = await apiClient.get(
        `/method/devx.api.user.public_get_support_team_members?center=${centerId}`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const submitAttendaceThunk = createAsyncThunk(
  'attendance/submitAttendace',
  async (formPayload, { rejectWithValue }) => {
    try {
      const payload = buildPayload(formPayload);
      if (payload == null) {
        return rejectWithValue(new Error('Unknown staff type'));
      }
      const response = await apiClient.post(
        '/method/devx.team_management.api.attendance.public_create_attendance',
        payload,
      );

      if (response.data?.message?.status === 'exists') {
        return rejectWithValue('attendanceAlreadyExists');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const addAttendancePhotoThunk = createAsyncThunk(
  'attendance/addAttendancePhoto',
  async (formPayload, { rejectWithValue }) => {
    try {
      // Accept either FormData or a plain object with attendance_id and image_file
      const body =
        formPayload instanceof FormData
          ? formPayload
          : (() => {
              const formData = new FormData();
              if (formPayload?.attendance_id) {
                formData.append('attendance_id', formPayload.attendance_id);
              }
              if (formPayload?.image_file) {
                formData.append('image_file', formPayload.image_file);
              }
              return formData;
            })();

      const response = await apiClient.post(
        '/method/devx.team_management.api.attendance.public_add_attendance_photo',
        body,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const createNewStaffThunk = createAsyncThunk(
  'attendance/createNewStaff',
  async (formData, { rejectWithValue }) => {
    try {
      const payload = buildCreateEmployeePayload(formData);
      const hasImage = formData?.image instanceof File;

      const body = hasImage
        ? (() => {
            const fd = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                fd.append(key, value);
              }
            });
            fd.append('image', formData.image);
            return fd;
          })()
        : payload;

      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.public_create_employee',
        body,
      );
      return response.data;
    } catch (error) {
      let message = error?.response?.data;

      if (message?._server_messages) {
        try {
          const parsed = JSON.parse(message._server_messages);
          const first = JSON.parse(parsed[0]);
          message = first.message;
        } catch {
          message = error.message;
        }
      }

      return rejectWithValue(String(message || error.message));
    }
  },
);

export const getSupportRolesThunk = createAsyncThunk(
  'attendance/getSupportRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.user.public_get_support_roles');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const initialState = {
  publicCenterList: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },

  employeeList: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },

  supportRoles: {
    data: {},
    isLoading: false,
    error: null,
    status: null,
  },
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder.addCase(getPublicCenterListThunk.pending, (state) => {
      state.publicCenterList.isLoading = true;
      state.publicCenterList.error = null;
      state.publicCenterList.status = null;
    });

    builder.addCase(getPublicCenterListThunk.fulfilled, (state, action) => {
      // console.log('public center list', action.payload);
      state.publicCenterList.isLoading = false;
      state.publicCenterList.data = action.payload?.message || action.payload || [];
    });

    builder.addCase(getPublicCenterListThunk.rejected, (state, action) => {
      state.publicCenterList.isLoading = false;
      state.publicCenterList.error = action.payload;
    });

    builder.addCase(getEmployeeListThunk.pending, (state) => {
      state.employeeList.isLoading = true;
      state.employeeList.error = null;
      state.employeeList.status = null;
    });

    builder.addCase(getEmployeeListThunk.fulfilled, (state, action) => {
      // console.log('employee list', action.payload);
      state.employeeList.isLoading = false;
      state.employeeList.data = action.payload?.message || action.payload || [];
    });

    builder.addCase(getEmployeeListThunk.rejected, (state, action) => {
      state.employeeList.isLoading = false;
      state.employeeList.error = action.payload;
    });

    builder.addCase(getSupportRolesThunk.pending, (state) => {
      state.supportRoles.isLoading = true;
      state.supportRoles.error = null;
      state.supportRoles.status = null;
    });

    builder.addCase(getSupportRolesThunk.fulfilled, (state, action) => {
      state.supportRoles.isLoading = false;
      state.supportRoles.data = action.payload?.message || action.payload || {};
    });

    builder.addCase(getSupportRolesThunk.rejected, (state, action) => {
      state.supportRoles.isLoading = false;
      state.supportRoles.error = action.payload;
    });
  },
});

export const { getPublicCenterList } = attendanceSlice.actions;
export default attendanceSlice.reducer;
