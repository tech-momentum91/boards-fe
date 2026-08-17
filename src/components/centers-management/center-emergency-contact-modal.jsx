import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiAlertLine,
  RiAddLine,
  RiArrowLeftLine,
  RiPhoneLine,
  RiPriceTag3Line,
  RiUser3Line,
} from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as LinkButton from '@/components/ui/link-button';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import StdPhoneInputField from '@/components/centers-management/std-phone-input-field';
import CenterEmergencyContactViewContent from '@/components/centers-management/center-emergency-contact-view-content';
import { createEmergencyContactSchema } from '@/components/centers-management/center-emergency-contact-schema';
import {
  formatContactNumber,
  parseContactNumber,
  withSavedStdOption,
} from '@/components/centers-management/utils/emergency-contact-phone-utils';
import { useStdCodeOptions } from '@/hooks/use-std-code-options';
import { isAdminRole } from '@/utils/user-role-utils';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {'add'|'edit'|'view'} props.mode
 * @param {object|null} props.contact
 * @param {string[]} props.categories
 * @param {boolean} [props.isCategoriesLoading]
 * @param {{ state?: string; city?: string }} [props.centerDetails] — STD list is limited to this state/city (center Basic details).
 * @param {boolean} [props.useFullStdList] — If true (no center), show searchable national STD list instead of location-filtered codes.
 * @param {(payload: {id?: string, contact_name: string, contact_number: string, category: string}) => void} props.onSave
 */
const CenterEmergencyContactModal = ({
  open,
  onOpenChange,
  mode,
  contact,
  centerDetails,
  useFullStdList = false,
  categories,
  isCategoriesLoading = false,
  onSave,
}) => {
  const isView = mode === 'view';
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [stdSearch, setStdSearch] = useState('');
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canCreateCategory = isAdminRole(userSideBarPerm);

  const { options: loadedStdOptions } = useStdCodeOptions(centerDetails, useFullStdList);
  const stdOptions = useMemo(() => {
    if (!open || !contact || mode === 'add') return loadedStdOptions;
    const parsed = parseContactNumber(contact.contact_number);
    return withSavedStdOption(loadedStdOptions, parsed.stdCode);
  }, [open, contact, mode, loadedStdOptions]);
  const stdOptionByKey = useMemo(
    () => new Map(stdOptions.map((o) => [o.optionKey, o])),
    [stdOptions],
  );
  const categoryOptions = useMemo(() => {
    const list = [...(categories || [])];
    if (contact?.category && !list.includes(contact.category)) {
      list.push(contact.category);
    }
    return list;
  }, [categories, contact]);

  const resolver = useMemo(
    () => zodResolver(createEmergencyContactSchema({ stdOptionByKey })),
    [stdOptionByKey],
  );

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver,
    defaultValues: {
      contact_name: '',
      category: '',
      newCategory: '',
      isSelectMode: true,
      std_selection: '',
      local_number: '',
    },
  });

  const isSelectMode = useWatch({ control, name: 'isSelectMode' });
  const stdSelection = useWatch({ control, name: 'std_selection' });
  const selectedStdOption = stdSelection ? stdOptionByKey.get(stdSelection) : null;

  useEffect(() => {
    if (!canCreateCategory) {
      setIsCreatingNewCategory(false);
      setValue('newCategory', '');
      setValue('isSelectMode', true);
      return;
    }
    setValue('isSelectMode', !isCreatingNewCategory);
  }, [canCreateCategory, isCreatingNewCategory, setValue]);

  useEffect(() => {
    if (!open) return;
    setStdSearch('');

    if (mode === 'add') {
      reset({
        contact_name: '',
        category: '',
        newCategory: '',
        isSelectMode: true,
        std_selection: '',
        local_number: '',
      });
      setIsCreatingNewCategory(false);
      return;
    }

    if (!contact) return;
    const parsed = parseContactNumber(contact.contact_number);
    const stdSel = stdOptions.find((o) => o.std_code === parsed.stdCode)?.optionKey || '';

    reset({
      contact_name: contact.contact_name || '',
      category: contact.category || '',
      newCategory: '',
      isSelectMode: true,
      std_selection: stdSel,
      local_number: parsed.localNumber,
    });
    setIsCreatingNewCategory(false);
  }, [open, mode, contact, reset, stdOptions]);

  const stdFiltered = useMemo(() => {
    const t = stdSearch.trim().toLowerCase();
    if (!t) return stdOptions.slice(0, 300);
    return stdOptions
      .filter((o) => o.label.toLowerCase().includes(t) || o.std_code.includes(t))
      .slice(0, 300);
  }, [stdOptions, stdSearch]);

  const onSubmit = (values) => {
    if (isView) return;
    const stdCode = values.std_selection
      ? stdOptionByKey.get(values.std_selection)?.std_code || ''
      : '';
    const finalCategory =
      !canCreateCategory || values.isSelectMode ? values.category : values.newCategory;
    onSave?.({
      id: contact?.id,
      contact_name: values.contact_name,
      category: finalCategory,
      contact_number: formatContactNumber(stdCode, values.local_number),
    });
    onOpenChange(false);
  };

  const title =
    mode === 'add'
      ? 'Add Emergency Contact'
      : mode === 'edit'
        ? 'Edit Emergency Contact'
        : 'Emergency Contact';
  const description =
    mode === 'add'
      ? 'Add emergency contact details.'
      : mode === 'edit'
        ? 'Update emergency contact details.'
        : 'View emergency contact details.';

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[560px]' showClose>
        <Modal.Header icon={RiAlertLine} title={title} description={description} />

        {isView ? (
          <CenterEmergencyContactViewContent
            contact={contact}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
            <Modal.Body className='flex flex-col gap-6'>
              <div className='flex flex-col gap-3'>
                <h3 className='text-label-md text-neutral-500'>Contact information</h3>
                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  <FieldRow icon={RiPriceTag3Line} label='Category' required>
                    {canCreateCategory && isCreatingNewCategory ? (
                      <div className='flex w-full flex-col gap-2'>
                        <Controller
                          name='newCategory'
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              size='xsmall'
                              variant='borderless'
                              hasError={Boolean(errors.newCategory)}
                            >
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='New category name' autoFocus />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {errors.newCategory && <ErrorText>{errors.newCategory.message}</ErrorText>}
                        <LinkButton.Root
                          type='button'
                          variant='primary'
                          onClick={() => {
                            setIsCreatingNewCategory(false);
                            setValue('newCategory', '');
                          }}
                          className='w-full justify-start text-paragraph-xs'
                        >
                          <RiArrowLeftLine /> Choose from existing categories
                        </LinkButton.Root>
                      </div>
                    ) : (
                      <>
                        <Controller
                          name='category'
                          control={control}
                          render={({ field }) => (
                            <Select.Root
                              value={field.value}
                              onValueChange={field.onChange}
                              variant='borderless'
                              size='xsmall'
                              disabled={isCategoriesLoading}
                              hasError={Boolean(errors.category)}
                            >
                              <Select.Trigger className='w-full'>
                                <Select.Value
                                  placeholder={
                                    isCategoriesLoading
                                      ? 'Loading categories...'
                                      : 'Select category'
                                  }
                                />
                              </Select.Trigger>
                              <Select.Content>
                                {canCreateCategory && (
                                  <Button.Root
                                    type='button'
                                    variant='ghost'
                                    className='text-green-600 px-[6px] gap-[8px] w-full justify-start'
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setIsCreatingNewCategory(true);
                                    }}
                                  >
                                    <Button.Icon as={RiAddLine} />
                                    Create new category
                                  </Button.Root>
                                )}
                                {categoryOptions.map((item) => (
                                  <Select.Item key={item} value={item}>
                                    {item}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                        />
                        {errors.category && isSelectMode && (
                          <ErrorText>{errors.category.message}</ErrorText>
                        )}
                      </>
                    )}
                  </FieldRow>

                  <FieldRow icon={RiUser3Line} label='Contact Name' required>
                    <Controller
                      name='contact_name'
                      control={control}
                      render={({ field }) => (
                        <Input.Root
                          size='xsmall'
                          variant='borderless'
                          hasError={Boolean(errors.contact_name)}
                        >
                          <Input.Wrapper>
                            <Input.Input {...field} placeholder='Enter contact name' />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.contact_name && <ErrorText>{errors.contact_name.message}</ErrorText>}
                  </FieldRow>

                  <FieldRow icon={RiPhoneLine} label='Contact Number' required alignTop>
                    <StdPhoneInputField
                      control={control}
                      errors={errors}
                      selectedStdOption={selectedStdOption}
                      stdSearch={stdSearch}
                      onStdSearchChange={setStdSearch}
                      stdFiltered={stdFiltered}
                      stdOptions={stdOptions}
                    />
                  </FieldRow>
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <div className='flex items-center justify-end gap-3 w-full'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button.Root>
                <Button.Root type='submit' size='medium'>
                  {mode === 'edit' ? 'Save changes' : 'Add contact'}
                </Button.Root>
              </div>
            </Modal.Footer>
          </form>
        )}
      </Modal.Content>
    </Modal.Root>
  );
};

export default CenterEmergencyContactModal;
