import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiDraggable,
} from 'react-icons/ri';
import * as Checkbox from '@/components/ui/checkbox';
import * as Select from '@/components/ui/select';
import IconColorPicker from '../../../sidebar/IconColorPicker';
import { CUSTOM_TAB_ALL_FIELDS } from '../constants/list-custom-fields-constants';
import CustomFieldInfoHint from './CustomFieldInfoHint';
import {
  createDefaultFieldOptions,
  createFieldOptionId,
  createInitialFieldForm,
  generateUniqueFieldName,
  getAddOptionLabel,
  getCustomFieldTypeHelp,
  getDefaultValueInputType,
  getDefaultValuePlaceholder,
  getExistingFieldLabels,
  getFieldTypeLabel,
  getOptionsSectionLabel,
  LABEL_COLOR_PRESETS,
  OPTION_FIELD_TYPES,
  supportsDefaultValue,
  usesColorOptions,
  validateFieldForm,
} from '../utils/custom-field-utils';

const ALL_FIELD_TYPES = CUSTOM_TAB_ALL_FIELDS;

function RequiredLabel({ children }) {
  return (
    <label className='flex items-center gap-0.5 text-sm font-medium text-text-main-900'>
      {children}
      <span className='text-text-soft-400'>*</span>
    </label>
  );
}

function FieldTextInput({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
}) {
  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-center gap-1'>
        {required ? (
          <RequiredLabel>{label}</RequiredLabel>
        ) : (
          <label className='text-sm font-medium text-text-main-900'>{label}</label>
        )}
        {hint ? <CustomFieldInfoHint description={hint} /> : null}
      </div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className='h-9 w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 text-sm text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] outline-none placeholder:text-text-soft-400 focus:border-primary-base focus:ring-1 focus:ring-primary-base'
      />
    </div>
  );
}

function ColorSwatchPicker({ value, onChange }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedColor = value ?? LABEL_COLOR_PRESETS[0];

  return (
    <>
      <button
        ref={anchorRef}
        type='button'
        aria-label='Select color'
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className='flex shrink-0 items-center rounded-[4px] border border-stroke-sub-300 bg-bg-white-0 p-[3px] outline-none transition hover:border-stroke-strong-950 focus-visible:border-primary-base'
      >
        <span
          className='size-2.5 rounded-[2px] shadow-[0px_16px_32px_-12px_rgba(88,92,95,0.1)]'
          style={{ backgroundColor: selectedColor }}
        />
      </button>

      {open
        ? createPortal(
            // Radix modal dialogs set `pointer-events: none` on <body> while open,
            // so the portaled picker must re-enable pointer events to be clickable.
            <div style={{ pointerEvents: 'auto' }}>
              <IconColorPicker
                anchorRef={anchorRef}
                selectedColor={selectedColor}
                onSelect={(color) => {
                  onChange(color);
                  setOpen(false);
                }}
                onClose={() => setOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function FieldOptionsEditor({ fieldType, options, onChange }) {
  const withColors = usesColorOptions(fieldType);

  const updateOption = (optionId, patch) => {
    onChange(options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)));
  };

  const removeOption = (optionId) => {
    if (options.length <= 1) {
      return;
    }

    onChange(options.filter((option) => option.id !== optionId));
  };

  const addOption = () => {
    const nextIndex = options.length;
    onChange([
      ...options,
      {
        id: createFieldOptionId(),
        label: withColors ? `Label ${nextIndex + 1}` : `Option ${nextIndex + 1}`,
        color: withColors ? LABEL_COLOR_PRESETS[nextIndex % LABEL_COLOR_PRESETS.length] : undefined,
      },
    ]);
  };

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-center justify-between'>
        <RequiredLabel>{getOptionsSectionLabel(fieldType)}</RequiredLabel>
        <span className='flex items-center gap-1 text-xs font-medium text-text-sub-500'>
          Manual
        </span>
      </div>

      <div className='flex flex-col gap-2'>
        {options.map((option) => (
          <div
            key={option.id}
            className='flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50/60 px-1 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
          >
            <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
              <RiDraggable size={16} />
            </span>

            {withColors ? (
              <ColorSwatchPicker
                value={option.color ?? LABEL_COLOR_PRESETS[0]}
                onChange={(color) => updateOption(option.id, { color })}
              />
            ) : null}

            <input
              value={option.label}
              onChange={(event) => updateOption(option.id, { label: event.target.value })}
              className='min-w-0 flex-1 bg-transparent text-sm font-medium text-text-main-900 outline-none'
            />

            <button
              type='button'
              aria-label='Remove option'
              disabled={options.length <= 1}
              onClick={() => removeOption(option.id)}
              className='flex size-7 shrink-0 items-center justify-center rounded-md text-icon-sub-500 transition hover:bg-bg-white-0 disabled:opacity-40'
            >
              <RiDeleteBinLine size={16} />
            </button>
          </div>
        ))}

        <button
          type='button'
          onClick={addOption}
          className='flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-sm text-text-soft-400 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] transition hover:bg-bg-weak-50'
        >
          <RiAddLine size={16} />
          {getAddOptionLabel(fieldType)}
        </button>
      </div>
    </div>
  );
}

function MoreFieldSettings({ form, onChange, expanded, onToggleExpanded }) {
  const typeHelp = getCustomFieldTypeHelp(form.type);

  return (
    <div className='border-b border-stroke-soft-200 pb-5'>
      <button
        type='button'
        onClick={onToggleExpanded}
        className='flex items-center gap-1 text-sm font-medium text-text-sub-500 transition hover:text-text-main-900'
      >
        More settings
        {expanded ? <RiArrowDownSLine size={18} /> : <RiArrowRightSLine size={18} />}
      </button>

      {expanded ? (
        <div className='mt-4 flex flex-col gap-4'>
          <div className='rounded-lg bg-information-lighter px-3 py-2 text-xs text-text-sub-600'>
            {typeHelp}
          </div>

          <FieldTextInput
            label='Description'
            value={form.description}
            onChange={(description) => onChange({ description })}
            placeholder='Tell users how to use this field'
            hint='Shown as more info on the field label in the task view.'
          />

          {supportsDefaultValue(form.type) ? (
            <FieldTextInput
              label='Default value'
              value={form.defaultValue}
              onChange={(defaultValue) => onChange({ defaultValue })}
              placeholder={getDefaultValuePlaceholder(form.type)}
              type={getDefaultValueInputType(form.type)}
            />
          ) : null}

          <label className='flex items-center gap-2'>
            <Checkbox.Root
              checked={form.required}
              onCheckedChange={(checked) => onChange({ required: checked === true })}
            />
            <span className='text-sm text-text-main-900'>Make required field</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

export default function CreateCustomFieldPanel({
  catalogField,
  existingColumns = [],
  onBack,
  onCreate,
}) {
  const [form, setForm] = useState(() => createInitialFieldForm(catalogField, existingColumns));
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [error, setError] = useState('');
  const nameTouchedRef = useRef(false);

  const existingLabels = useMemo(() => getExistingFieldLabels(existingColumns), [existingColumns]);

  const fieldTypeOptions = useMemo(
    () =>
      ALL_FIELD_TYPES.map((field) => ({
        value: field.templateId ?? field.type,
        label: field.label,
        type: field.type,
        templateId: field.templateId ?? field.type,
      })),
    [],
  );

  const selectedTypeOption = useMemo(() => {
    const match = fieldTypeOptions.find(
      (option) =>
        option.templateId === form.templateId || (option.type === form.type && !form.templateId),
    );

    return match ?? fieldTypeOptions.find((option) => option.type === form.type);
  }, [fieldTypeOptions, form.templateId, form.type]);

  const updateForm = (patch) => {
    setForm((previous) => ({ ...previous, ...patch }));
    setError('');
  };

  const handleNameChange = (name) => {
    nameTouchedRef.current = true;
    updateForm({ name });
  };

  const handleTypeChange = (templateId) => {
    const nextType = fieldTypeOptions.find((option) => option.value === templateId);

    if (!nextType) {
      return;
    }

    const withColors = usesColorOptions(nextType.type);

    updateForm({
      type: nextType.type,
      templateId: nextType.templateId,
      // Keep a manually-edited name; otherwise auto-suggest a unique name based
      // on the newly selected type so the same field type can be added repeatedly.
      name: nameTouchedRef.current
        ? form.name
        : generateUniqueFieldName(nextType.label, existingLabels),
      options: OPTION_FIELD_TYPES.has(nextType.type)
        ? createDefaultFieldOptions(2, { withColors })
        : [],
      defaultValue: '',
    });
  };

  const handleCreate = () => {
    const validationError = validateFieldForm(form, existingLabels);

    if (validationError) {
      setError(validationError);
      return;
    }

    onCreate?.(form);
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='flex shrink-0 items-center gap-2 border-b border-stroke-soft-200 px-6 py-5'>
        <button
          type='button'
          aria-label='Back to field types'
          onClick={onBack}
          className='flex size-7 items-center justify-center rounded-md text-icon-sub-500 transition hover:bg-bg-weak-50'
        >
          <RiArrowLeftLine size={18} />
        </button>

        <Select.Root
          value={selectedTypeOption?.value}
          onValueChange={handleTypeChange}
          matchTriggerWidth={false}
        >
          <Select.Trigger
            size='small'
            className='h-auto border-0 bg-transparent p-0 shadow-none ring-0'
          >
            <span className='flex items-center gap-1.5 text-base font-medium text-text-main-900'>
              {getFieldTypeLabel(form.type)}
              <RiArrowDownSLine size={18} className='text-icon-sub-500' />
            </span>
          </Select.Trigger>
          <Select.Content className='max-h-72 min-w-[220px]'>
            {fieldTypeOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                <span className='whitespace-normal'>{option.label}</span>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto pt-4'>
        <div className='flex flex-col gap-5 border-b border-stroke-soft-200 px-6 pb-5'>
          <FieldTextInput
            label='Field Name'
            required
            value={form.name}
            onChange={handleNameChange}
            placeholder='Enter field name'
          />

          {OPTION_FIELD_TYPES.has(form.type) ? (
            <FieldOptionsEditor
              fieldType={form.type}
              options={form.options}
              onChange={(options) => updateForm({ options })}
            />
          ) : null}
        </div>

        <div className='px-6 pt-5'>
          <MoreFieldSettings
            form={form}
            onChange={updateForm}
            expanded={showMoreSettings}
            onToggleExpanded={() => setShowMoreSettings((previous) => !previous)}
          />
        </div>

        {error ? <p className='px-6 pt-3 text-sm text-error-base'>{error}</p> : null}
      </div>

      <div className='flex shrink-0 justify-end border-t border-stroke-soft-200 px-6 py-4'>
        <button
          type='button'
          onClick={handleCreate}
          className='rounded-lg bg-primary-base px-4 py-2 text-sm font-medium text-text-white-0 transition hover:bg-primary-darker'
        >
          Create field
        </button>
      </div>
    </div>
  );
}
