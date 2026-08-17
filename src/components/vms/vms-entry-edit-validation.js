/**
 * View-drawer edit validation — aligned with invite schemas + VMS tablet check-in.
 */

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_DIGITS_REQUIRED = 10;

function getMergedValue(visitor, localChanges, key) {
  if (localChanges && hasOwn(localChanges, key)) return localChanges[key];
  return visitor?.[key];
}

function requireTrimmed(errors, key, value, message = 'Field is mandatory') {
  if (!String(value ?? '').trim()) {
    errors[key] = message;
  }
}

function validateEmailField(errors, key, value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    errors[key] = 'Field is mandatory';
    return;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    errors[key] = 'Enter a valid email address';
  }
}

function countNationalMobileDigits(value) {
  const digits = String(value ?? '').replaceAll(/\D/g, '');
  if (!digits) return 0;
  if (digits.length > MOBILE_DIGITS_REQUIRED) {
    return digits.slice(-MOBILE_DIGITS_REQUIRED).length;
  }
  return digits.length;
}

function validateMobileField(errors, key, value) {
  if (countNationalMobileDigits(value) !== MOBILE_DIGITS_REQUIRED) {
    errors[key] = 'Enter a valid 10-digit mobile number';
  }
}

function validatePositiveInt(
  errors,
  key,
  value,
  { required = true, message = 'Field is mandatory' } = {},
) {
  if (value === '' || value == null) {
    if (required) errors[key] = message;
    return;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    errors[key] = message;
  }
}

/** UI-only key in view drawer; ERP stores client vs devx via `host_company_name`. */
export function resolveWhomToMeet(visitor, localChanges) {
  if (localChanges && hasOwn(localChanges, '__whom_to_meet')) {
    return localChanges.__whom_to_meet === 'client' ? 'client' : 'devx';
  }
  const hostCompany = String(
    getMergedValue(visitor, localChanges, 'host_company_name') ?? '',
  ).trim();
  return hostCompany ? 'client' : 'devx';
}

export function getResolvedHostName(visitor, localChanges) {
  if (localChanges && hasOwn(localChanges, 'host')) {
    return String(localChanges.host ?? '').trim();
  }
  return String(visitor?.host || visitor?.host_display_name || '').trim();
}

export function validateVisitorHostFields(visitor, localChanges) {
  const errors = {};
  const whomToMeet =
    localChanges && hasOwn(localChanges, 'whom_to_meet')
      ? localChanges.whom_to_meet === 'client'
        ? 'client'
        : 'devx'
      : resolveWhomToMeet(visitor, localChanges);
  const host = getResolvedHostName(visitor, localChanges);
  const hostCompany = String(
    getMergedValue(visitor, localChanges, 'host_company_name') ?? '',
  ).trim();

  if (!host) {
    errors.host = 'Host name is required';
  }
  if (whomToMeet === 'client' && !hostCompany) {
    errors.host_company_name = 'Host company is required when meeting a client';
  }
  return errors;
}

export function validateVisitorPurposeFields(
  visitor,
  localChanges,
  { requirePurpose = false } = {},
) {
  const errors = {};
  const purpose = String(getMergedValue(visitor, localChanges, 'purpose_of_visit') ?? '').trim();
  const otherPurpose = String(getMergedValue(visitor, localChanges, 'other_purpose') ?? '').trim();

  if (requirePurpose && !purpose) {
    errors.purpose_of_visit = 'Purpose of visit is required';
  }
  if (purpose.toLowerCase() === 'other' && !otherPurpose) {
    errors.other_purpose = 'Other purpose is required when purpose is Other';
  }
  return errors;
}

function validateCommonIdentityFields(visitor, localChanges) {
  const errors = {};
  requireTrimmed(errors, 'first_name', getMergedValue(visitor, localChanges, 'first_name'));
  requireTrimmed(errors, 'last_name', getMergedValue(visitor, localChanges, 'last_name'));
  validateMobileField(
    errors,
    'mobile_number',
    getMergedValue(visitor, localChanges, 'mobile_number'),
  );
  validateEmailField(errors, 'email', getMergedValue(visitor, localChanges, 'email'));
  requireTrimmed(errors, 'center', getMergedValue(visitor, localChanges, 'center'));
  return errors;
}

function validateVisitScheduleFields(visitor, localChanges) {
  const errors = {};
  const visitDateTime = getMergedValue(visitor, localChanges, 'visit_date_time');
  if (!String(visitDateTime ?? '').trim()) {
    errors.visit_date_time = 'Visit date and time are required';
  }
  return errors;
}

function validateVisitorTypeFields(visitor, localChanges) {
  return {
    ...validateCommonIdentityFields(visitor, localChanges),
    ...validateVisitScheduleFields(visitor, localChanges),
    ...validateVisitorHostFields(visitor, localChanges),
    ...validateVisitorPurposeFields(visitor, localChanges, { requirePurpose: true }),
    ...(() => {
      const errors = {};
      validatePositiveInt(
        errors,
        'no_of_visitors',
        getMergedValue(visitor, localChanges, 'no_of_visitors'),
        {
          required: true,
          message: 'Number of visitors is required',
        },
      );
      return errors;
    })(),
  };
}

function validateVendorTypeFields(visitor, localChanges) {
  const errors = {
    ...validateCommonIdentityFields(visitor, localChanges),
    ...validateVisitScheduleFields(visitor, localChanges),
    ...validateVisitorPurposeFields(visitor, localChanges),
  };
  requireTrimmed(errors, 'vendor', getMergedValue(visitor, localChanges, 'vendor'));
  requireTrimmed(
    errors,
    'assigned_supervisor',
    getMergedValue(visitor, localChanges, 'assigned_supervisor'),
  );

  const materialCarrying = getMergedValue(visitor, localChanges, 'material_carrying');
  const isCarrying =
    materialCarrying === 1 || materialCarrying === '1' || materialCarrying === true;
  if (isCarrying) {
    requireTrimmed(
      errors,
      'material_desc',
      getMergedValue(visitor, localChanges, 'material_desc'),
      'Material description is required when carrying material',
    );
  }
  return errors;
}

function validateSpaceDirectFields(visitor, localChanges) {
  const errors = {
    ...validateCommonIdentityFields(visitor, localChanges),
    ...validateVisitScheduleFields(visitor, localChanges),
  };
  requireTrimmed(errors, 'type_of_space', getMergedValue(visitor, localChanges, 'type_of_space'));
  validatePositiveInt(errors, 'seats', getMergedValue(visitor, localChanges, 'seats'));

  const sourceCategory = String(
    getMergedValue(visitor, localChanges, 'source_category') ?? '',
  ).trim();
  if (sourceCategory === 'Other') {
    requireTrimmed(errors, 'other_source', getMergedValue(visitor, localChanges, 'other_source'));
  }
  return errors;
}

function normalizeCpType(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'ipc') return 'IPC';
  if (normalized === 'dpc') return 'DPC';
  if (normalized === 'digital') return 'Digital';
  return '';
}

function validateSpaceChannelPartnerFields(visitor, localChanges, cpType) {
  const errors = {
    ...validateVisitScheduleFields(visitor, localChanges),
  };

  const resolvedCpType = normalizeCpType(
    getMergedValue(visitor, localChanges, 'cp_type') || cpType,
  );
  if (!resolvedCpType) {
    errors.cp_type = 'Field is mandatory';
  }

  requireTrimmed(
    errors,
    'cp_company_legal_name',
    getMergedValue(visitor, localChanges, 'cp_company_legal_name') ||
      getMergedValue(visitor, localChanges, 'company_name'),
  );

  if (resolvedCpType === 'IPC' || resolvedCpType === 'DPC') {
    requireTrimmed(errors, 'ipc_name', getMergedValue(visitor, localChanges, 'ipc_name'));
  }

  requireTrimmed(errors, 'first_name', getMergedValue(visitor, localChanges, 'first_name'));
  requireTrimmed(errors, 'last_name', getMergedValue(visitor, localChanges, 'last_name'));
  validateMobileField(
    errors,
    'mobile_number',
    getMergedValue(visitor, localChanges, 'mobile_number'),
  );
  validateEmailField(errors, 'email', getMergedValue(visitor, localChanges, 'email'));
  requireTrimmed(errors, 'center', getMergedValue(visitor, localChanges, 'center'));

  requireTrimmed(
    errors,
    'client_first_name',
    getMergedValue(visitor, localChanges, 'client_first_name'),
  );
  requireTrimmed(
    errors,
    'client_last_name',
    getMergedValue(visitor, localChanges, 'client_last_name'),
  );
  validateMobileField(
    errors,
    'client_mobile_number',
    getMergedValue(visitor, localChanges, 'client_mobile_number') ||
      getMergedValue(visitor, localChanges, 'cp_contact_mobile'),
  );

  const clientEmail =
    getMergedValue(visitor, localChanges, 'client_email') ||
    getMergedValue(visitor, localChanges, 'cp_contact_email');
  if (!String(clientEmail ?? '').trim()) {
    errors.client_email = 'Field is mandatory';
  } else if (!EMAIL_PATTERN.test(String(clientEmail).trim())) {
    errors.client_email = 'Enter a valid email address';
  }

  requireTrimmed(errors, 'type_of_space', getMergedValue(visitor, localChanges, 'type_of_space'));
  validatePositiveInt(errors, 'seats', getMergedValue(visitor, localChanges, 'seats'));

  return errors;
}

/**
 * @param {object} context
 * @param {string} context.entryType — Visitor Entry `type`
 * @param {string} [context.spaceInquiryType]
 * @param {string} [context.cpType]
 */
export function validateEntryEditFields(visitor, localChanges, context = {}) {
  const entryType = context.entryType || visitor?.type || 'Visitor';
  const spaceInquiryType = context.spaceInquiryType || visitor?.space_inquiry_type;

  if (entryType === 'Vendor') {
    return validateVendorTypeFields(visitor, localChanges);
  }

  if (entryType === 'Space') {
    if (spaceInquiryType === 'Channel Partner') {
      return validateSpaceChannelPartnerFields(visitor, localChanges, context.cpType);
    }
    return validateSpaceDirectFields(visitor, localChanges);
  }

  // Visitor and Event Participant (same rules as invite visitor schema)
  return validateVisitorTypeFields(visitor, localChanges);
}

/** @deprecated Use validateEntryEditFields */
export function validateVisitorEditFields(visitor, localChanges) {
  return validateEntryEditFields(visitor, localChanges, { entryType: 'Visitor' });
}

const VALIDATION_GROUPS = [
  ['first_name', 'last_name', 'mobile_number', 'email', 'center'],
  ['host', 'host_company_name', '__whom_to_meet'],
  ['purpose_of_visit', 'other_purpose'],
  ['no_of_visitors'],
  ['visit_date_time'],
  ['company_name', 'cp_company_legal_name'],
  ['type_of_space', 'seats'],
  ['source_category', 'other_source'],
  ['sales_person_in_touch'],
  ['cp_type', 'ipc_name'],
  [
    'client_company_name',
    'cp_contact_name',
    'client_first_name',
    'client_last_name',
    'cp_contact_mobile',
    'client_mobile_number',
    'cp_contact_email',
    'client_email',
  ],
  ['vendor', 'vendor_type', 'assigned_supervisor'],
  ['material_carrying', 'material_desc'],
];

/** Returns errors that should block persisting `apiKey`. */
export function getBlockingErrorsForSave(apiKey, errors) {
  const group = VALIDATION_GROUPS.find((keys) => keys.includes(apiKey));
  if (!group) {
    return errors[apiKey] ? { [apiKey]: errors[apiKey] } : {};
  }
  return group.reduce((acc, key) => {
    if (errors[key]) acc[key] = errors[key];
    return acc;
  }, {});
}

export function clearValidationErrorsForSave(prev, apiKey) {
  const group = VALIDATION_GROUPS.find((keys) => keys.includes(apiKey)) || [apiKey];
  const next = { ...prev };
  group.forEach((key) => {
    next[key] = '';
  });
  return next;
}

/** Field-level validation for ticket-style blur/save handlers. */
export function getFieldBlockingErrors(fieldKey, value, visitor, localChanges, context) {
  const nextChanges = { ...localChanges, [fieldKey]: value };
  const errors = validateEntryEditFields(visitor, nextChanges, context);
  return getBlockingErrorsForSave(fieldKey, errors);
}
