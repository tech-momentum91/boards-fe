import { BOARD_ICON_COLORS } from '../../../components/board-color-utils';

export const OPTION_FIELD_TYPES = new Set(['dropdown', 'labels', 'tags']);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s().-]{7,20}$/;

export const CUSTOM_FIELD_TYPE_HELP = {
  dropdown: 'Select one option from the dropdown list.',
  labels: 'Assign a single colored label to categorize the task.',
  tags: 'Assign one or more colored tags to the task.',
  text: 'Enter a short single-line text value.',
  email: 'Enter a valid email address. Click to open in your mail client.',
  phone: 'Enter a phone number. Click to call on supported devices.',
  'long-text': 'Enter multi-line text for longer notes or descriptions.',
  date: 'Pick a date from the calendar.',
  number: 'Enter a numeric value.',
  image: 'Upload an image file. The task must be saved first.',
  url: 'Enter a web address. It opens in a new tab when set.',
  checkbox: 'Toggle on or off.',
  'file-upload': 'Upload a file attachment. The task must be saved first.',
  people: 'Assign one or more team members.',
};

export function getCustomFieldTypeHelp(fieldType) {
  return CUSTOM_FIELD_TYPE_HELP[fieldType] ?? 'Custom field value.';
}

export function getCustomFieldDescription(column = {}) {
  if (column?.erp || String(column?.key ?? '').startsWith('erp:')) {
    const moduleLabel = column.moduleLabel || 'module';
    return `Select a ${moduleLabel} record to fill this field from the linked entity.`;
  }

  const description = String(column?.config?.description ?? '').trim();
  return description || getCustomFieldTypeHelp(column?.fieldType);
}

export function getDefaultValueInputType(fieldType) {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'url':
      return 'url';
    case 'number':
      return 'number';
    default:
      return 'text';
  }
}

export function getDefaultValuePlaceholder(fieldType) {
  switch (fieldType) {
    case 'email':
      return 'name@example.com';
    case 'phone':
      return '+1 555 000 0000';
    case 'url':
      return 'https://example.com';
    case 'number':
      return '0';
    default:
      return 'Enter default value';
  }
}

function isEmptyCustomFieldValue(value) {
  return (
    value == null || value === '' || value === false || (Array.isArray(value) && value.length === 0)
  );
}

export function normalizeUrlValue(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return '';
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).href;
  } catch {
    return null;
  }
}

export function isCheckboxChecked(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function normalizeCustomFieldValue(fieldType, value) {
  if (isEmptyCustomFieldValue(value)) {
    if (fieldType === 'checkbox') {
      return false;
    }

    if (fieldType === 'labels' || fieldType === 'tags' || fieldType === 'people') {
      return [];
    }

    return '';
  }

  switch (fieldType) {
    case 'email':
      return String(value).trim().toLowerCase();
    case 'phone':
    case 'text':
    case 'long-text':
      return String(value).trim();
    case 'url': {
      const normalized = normalizeUrlValue(value);
      return normalized ?? String(value).trim();
    }
    case 'number':
      return String(value).trim();
    case 'checkbox':
      return isCheckboxChecked(value);
    case 'labels':
    case 'tags':
    case 'people':
      return Array.isArray(value) ? value.map(String) : [String(value)];
    default:
      return value;
  }
}

export function validateCustomFieldValue(fieldType, value, column = {}) {
  const label = column?.label || 'This field';
  const required = Boolean(column?.config?.required);
  const options = column?.config?.options ?? [];
  const normalizedValue = normalizeCustomFieldValue(fieldType, value);
  const isEmpty = isEmptyCustomFieldValue(normalizedValue);

  if (isEmpty) {
    return required ? `${label} is required` : null;
  }

  switch (fieldType) {
    case 'email':
      if (!EMAIL_REGEX.test(String(normalizedValue))) {
        return 'Enter a valid email address';
      }
      return null;
    case 'phone':
      if (!PHONE_REGEX.test(String(normalizedValue))) {
        return 'Enter a valid phone number';
      }
      return null;
    case 'url':
      if (!normalizeUrlValue(normalizedValue)) {
        return 'Enter a valid URL';
      }
      return null;
    case 'number':
      if (Number.isNaN(Number(normalizedValue))) {
        return 'Enter a valid number';
      }
      return null;
    case 'dropdown': {
      const hasOption = options.some(
        (option) =>
          String(option.id) === String(normalizedValue) ||
          String(option.label) === String(normalizedValue),
      );

      return hasOption ? null : 'Select a valid option';
    }
    case 'labels': {
      const selectedId = Array.isArray(normalizedValue)
        ? String(normalizedValue[0] ?? '')
        : String(normalizedValue);
      const hasLabel = options.some((option) => String(option.id) === selectedId);

      return hasLabel ? null : 'Select a valid label';
    }
    case 'tags': {
      const selectedIds = Array.isArray(normalizedValue) ? normalizedValue.map(String) : [];
      const hasInvalidTag = selectedIds.some(
        (id) => !options.some((option) => String(option.id) === id),
      );

      return hasInvalidTag ? 'Select valid tags' : null;
    }
    case 'people':
      return null;
    case 'image':
    case 'file-upload':
      if (typeof normalizedValue === 'object' && normalizedValue?.url) {
        return null;
      }

      return typeof normalizedValue === 'string' && normalizedValue ? null : 'Upload a file';
    default:
      return null;
  }
}

export function validateCustomFieldDefaultValue(fieldType, value) {
  if (value == null || value === '') {
    return null;
  }

  return validateCustomFieldValue(fieldType, value, {
    label: 'Default value',
    config: { required: true },
  });
}

// Field types that accept a free-text "default value" in the create panel.
// Other types (date, checkbox, image, file upload, people, option types)
// either have no sensible text default or manage defaults differently.
export const DEFAULT_VALUE_FIELD_TYPES = new Set([
  'text',
  'long-text',
  'number',
  'email',
  'phone',
  'url',
]);

export function supportsDefaultValue(type) {
  return DEFAULT_VALUE_FIELD_TYPES.has(type);
}

/** Default label/option colors — same palette as the boards color picker. */
export const LABEL_COLOR_PRESETS = BOARD_ICON_COLORS;

export function createFieldOptionId() {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createCustomFieldId() {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultFieldOptions(count = 2, { withColors = false } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    id: createFieldOptionId(),
    label: withColors ? `Label ${index + 1}` : `Option ${index + 1}`,
    color: withColors ? LABEL_COLOR_PRESETS[index % LABEL_COLOR_PRESETS.length] : undefined,
  }));
}

export function getFieldTypeLabel(type) {
  const labels = {
    dropdown: 'Dropdown',
    labels: 'Labels',
    tags: 'Tags',
    text: 'Text',
    email: 'Email',
    phone: 'Phone',
    'long-text': 'Long Text',
    date: 'Date',
    number: 'Number',
    image: 'Image',
    url: 'URL',
    checkbox: 'Checkbox',
    'file-upload': 'File Upload',
    people: 'People',
  };

  return labels[type] ?? type;
}

export function getOptionsSectionLabel(type) {
  if (type === 'labels') {
    return 'Label Options';
  }

  if (type === 'tags') {
    return 'Tag Options';
  }

  return 'Dropdown Options';
}

export function getAddOptionLabel(type) {
  if (type === 'labels') {
    return 'Add Label';
  }

  if (type === 'tags') {
    return 'Add Tag';
  }

  return 'Add Option';
}

export function usesColorOptions(type) {
  return type === 'labels' || type === 'tags';
}

export function resolveColumnFieldOption(groupKey, column) {
  if (groupKey == null || groupKey === '') {
    return null;
  }

  const options = column?.config?.options ?? [];
  const normalizedKey = String(groupKey).trim();
  const normalizedKeyLower = normalizedKey.toLowerCase();

  return (
    options.find((option) => {
      const candidates = [option.id, option.name, option.value, option.label]
        .filter((entry) => entry != null && entry !== '')
        .map((entry) => String(entry).trim());

      return candidates.some(
        (candidate) =>
          candidate === normalizedKey || candidate.toLowerCase() === normalizedKeyLower,
      );
    }) ?? null
  );
}

function normalizeLabel(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function getExistingFieldLabels(columns = []) {
  return (Array.isArray(columns) ? columns : [])
    .map((column) => normalizeLabel(column?.label))
    .filter(Boolean);
}

export function isDuplicateFieldName(name, existingLabels = []) {
  const normalized = normalizeLabel(name);

  if (!normalized) {
    return false;
  }

  return existingLabels.includes(normalized);
}

export function generateUniqueFieldName(baseName, existingLabels = []) {
  const base = String(baseName ?? '').trim() || 'Field';

  if (!isDuplicateFieldName(base, existingLabels)) {
    return base;
  }

  let counter = 2;
  let candidate = `${base} ${counter}`;

  while (isDuplicateFieldName(candidate, existingLabels)) {
    counter += 1;
    candidate = `${base} ${counter}`;
  }

  return candidate;
}

export function createInitialFieldForm(catalogField = {}, existingColumns = []) {
  const type = catalogField.type ?? 'text';
  const withColors = usesColorOptions(type);
  const baseName = catalogField.suggestedName ?? catalogField.label ?? '';
  const existingLabels = getExistingFieldLabels(existingColumns);

  return {
    type,
    templateId: catalogField.templateId ?? type,
    name: baseName ? generateUniqueFieldName(baseName, existingLabels) : '',
    description: '',
    defaultValue: '',
    required: false,
    options: OPTION_FIELD_TYPES.has(type) ? createDefaultFieldOptions(2, { withColors }) : [],
  };
}

export function validateFieldForm(form, existingLabels = []) {
  const name = form.name?.trim();

  if (!name) {
    return 'Field name is required';
  }

  if (isDuplicateFieldName(name, existingLabels)) {
    return 'A field with this name already exists in this list';
  }

  if (OPTION_FIELD_TYPES.has(form.type)) {
    const validOptions = (form.options ?? []).filter((option) => option.label?.trim());

    if (validOptions.length === 0) {
      return 'At least one option is required';
    }

    const seen = new Set();

    for (const option of validOptions) {
      const normalized = normalizeLabel(option.label);

      if (seen.has(normalized)) {
        return 'Option labels must be unique';
      }

      seen.add(normalized);
    }
  }

  if (supportsDefaultValue(form.type) && form.defaultValue) {
    const defaultValueError = validateCustomFieldDefaultValue(form.type, form.defaultValue);

    if (defaultValueError) {
      return defaultValueError;
    }
  }

  return null;
}

export function buildCustomFieldDefinition(form) {
  const id = createCustomFieldId();
  const options = OPTION_FIELD_TYPES.has(form.type)
    ? (form.options ?? [])
        .map((option) => ({
          id: option.id || createFieldOptionId(),
          label: option.label?.trim(),
          color: option.color,
        }))
        .filter((option) => option.label)
    : [];

  return {
    id,
    label: form.name.trim(),
    type: form.type,
    templateId: form.templateId ?? form.type,
    config: {
      description: form.description?.trim() ?? '',
      defaultValue: supportsDefaultValue(form.type)
        ? normalizeCustomFieldValue(form.type, form.defaultValue ?? '')
        : (form.defaultValue ?? ''),
      required: Boolean(form.required),
      options,
    },
  };
}

export function getDefaultValueForFieldType(type, defaultValue) {
  if (type === 'checkbox') {
    return isCheckboxChecked(defaultValue);
  }

  if (type === 'labels' || type === 'tags' || type === 'people') {
    if (Array.isArray(defaultValue)) {
      return defaultValue;
    }

    if (defaultValue == null || defaultValue === '') {
      return [];
    }

    return [String(defaultValue)];
  }

  return defaultValue ?? '';
}

export function resolveCustomFieldDisplayValue(value, column) {
  if (column?.fieldType === 'checkbox') {
    if (value != null && value !== '') {
      return isCheckboxChecked(value);
    }

    const defaultValue = column?.config?.defaultValue;
    return defaultValue == null ? false : isCheckboxChecked(defaultValue);
  }

  if (value != null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
    return value;
  }

  const defaultValue = column?.config?.defaultValue;

  if (defaultValue == null || defaultValue === '') {
    return value;
  }

  return getDefaultValueForFieldType(column.fieldType, defaultValue);
}
