import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isBefore, isValid, parse, startOfDay, startOfMonth } from 'date-fns';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { RiAddLine, RiErrorWarningFill, RiMoneyDollarCircleLine } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import * as Hint from '@/components/ui/hint';
import { Datepicker } from '@/components/ui/datepicker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MONTH_OPTIONS } from '@/constants/constants';
import AddBillingCategoryModal from '@/components/billing-management/add-billing-category-modal';
import {
  addClientBilling,
  createClientBillingCategory,
  fetchBillingFilterOptions,
  fetchCenterWiseClientsThunk,
  fetchClients,
  selectBillingFilterOptions,
  selectBillingMutations,
  selectClientBillingCategories,
} from '@/redux/billingSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const getDefaultYear = () => String(new Date().getFullYear());
const getDefaultMonth = () => MONTH_OPTIONS[new Date().getMonth()];

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

const getMonthNumber = (monthName) => {
  const index = MONTH_OPTIONS.indexOf(monthName);
  return index >= 0 ? index + 1 : null;
};

const getBillingPeriodStart = (monthName, yearStr) => {
  const monthIndex = MONTH_OPTIONS.indexOf(monthName);
  const year = Number.parseInt(String(yearStr), 10);
  if (monthIndex < 0 || Number.isNaN(year)) return null;
  return startOfMonth(new Date(year, monthIndex, 1));
};

const addBillingSchema = z
  .object({
    client: z.string().min(1, 'Client is required'),
    center: z.string().min(1, 'Center is required'),
    billing_category: z.string().min(1, 'Category is required'),
    billing_month: z.string().min(1, 'Billing month is required'),
    billing_year: z.string().min(1, 'Billing year is required'),
    payment_due_date: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const dueDateStr = (data.payment_due_date || '').trim();
    if (!dueDateStr) return;

    const periodStart = getBillingPeriodStart(data.billing_month, data.billing_year);
    if (!periodStart) return;

    const dueDate = parse(dueDateStr, 'yyyy-MM-dd', new Date());
    if (!isValid(dueDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payment_due_date'],
        message: 'Enter a valid due date',
      });
      return;
    }

    if (isBefore(startOfDay(dueDate), periodStart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payment_due_date'],
        message: `Due date cannot be before ${format(periodStart, 'MMMM yyyy')}`,
      });
    }
  });

const normalizeCategoryOptions = (categories = []) =>
  (categories || []).map((item) => {
    if (typeof item === 'string') {
      return { value: item, label: item };
    }
    return {
      value: item?.value ?? item?.name ?? item?.category ?? '',
      label: item?.label ?? item?.category ?? item?.name ?? '',
    };
  });

const AddBillingModal = ({
  isOpen,
  onOpenChange,
  onSuccess,
  lockedClient = '',
  lockedClientLabel = '',
  clientCenterOptions = [],
}) => {
  const dispatch = useDispatch();
  const filterOptions = useSelector(selectBillingFilterOptions);
  const mutations = useSelector(selectBillingMutations);
  const clientCategories = useSelector(selectClientBillingCategories);
  const clientList = useSelector((state) => state.billing.clientList?.data);
  const centerWiseClients = useSelector((state) => state.billing.centerWiseClients?.data);

  const isLoading = mutations.addBillingStatus === 'loading';
  const isAddCategoryLoading = clientCategories.createStatus === 'loading';
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
    trigger,
  } = useForm({
    resolver: zodResolver(addBillingSchema),
    defaultValues: {
      client: '',
      center: '',
      billing_category: '',
      billing_month: getDefaultMonth(),
      billing_year: getDefaultYear(),
      payment_due_date: '',
    },
  });

  const selectedClient = watch('client');
  const billingMonth = watch('billing_month');
  const billingYear = watch('billing_year');

  const minDueDate = useMemo(
    () => getBillingPeriodStart(billingMonth, billingYear) ?? undefined,
    [billingMonth, billingYear],
  );

  const clientData = clientList?.data || clientList || [];
  const clientOptions = useMemo(
    () =>
      (Array.isArray(clientData) ? clientData : []).map((client) => ({
        value: client.name,
        label: client.customer_name || client.name,
      })),
    [clientData],
  );

  const categoryOptions = useMemo(
    () => normalizeCategoryOptions(filterOptions?.categories),
    [filterOptions?.categories],
  );

  const centerOptions = useMemo(() => {
    if (lockedClient && clientCenterOptions.length > 0) {
      return clientCenterOptions.map((center) => ({
        value: center.center,
        label: center.center_name || center.center,
      }));
    }

    if (!selectedClient) return [];

    const groups = centerWiseClients?.message?.groups || centerWiseClients?.groups || [];
    return groups
      .filter((group) =>
        (group.clients || []).some(
          (client) => String(client?.id ?? client) === String(selectedClient),
        ),
      )
      .map((group) => ({
        value: group.center,
        label: group.center_name || group.center,
      }));
  }, [lockedClient, clientCenterOptions, selectedClient, centerWiseClients]);

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchClients());
    dispatch(fetchCenterWiseClientsThunk());
    dispatch(fetchBillingFilterOptions());
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCategoryDropdownOpen(false);
      reset({
        client: '',
        center: '',
        billing_category: '',
        billing_month: getDefaultMonth(),
        billing_year: getDefaultYear(),
        payment_due_date: '',
      });
      return;
    }

    reset({
      client: lockedClient || '',
      center: '',
      billing_category: '',
      billing_month: getDefaultMonth(),
      billing_year: getDefaultYear(),
      payment_due_date: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when modal opens
  }, [isOpen, lockedClient]);

  useEffect(() => {
    if (!isOpen || !lockedClient) return;
    setValue('client', lockedClient);
  }, [isOpen, lockedClient, setValue]);

  useEffect(() => {
    if (!isOpen || lockedClient) return;
    setValue('center', '');
    setValue('billing_category', '');
  }, [selectedClient, isOpen, lockedClient, setValue]);

  useEffect(() => {
    if (!isOpen) return;
    void trigger('payment_due_date');
  }, [billingMonth, billingYear, isOpen, trigger]);

  useEffect(() => {
    if (!isOpen || !minDueDate) return;

    const dueDateStr = (getValues('payment_due_date') || '').trim();
    if (!dueDateStr) return;

    const dueDate = parse(dueDateStr, 'yyyy-MM-dd', new Date());
    if (isValid(dueDate) && isBefore(startOfDay(dueDate), minDueDate)) {
      setValue('payment_due_date', '', { shouldValidate: true });
    }
  }, [billingMonth, billingYear, minDueDate, isOpen, getValues, setValue]);

  const handleAddCategoryClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCategoryDropdownOpen(false);
    setIsAddCategoryModalOpen(true);
  };

  const handleAddBillingCategory = useCallback(
    async (data) => {
      try {
        await dispatch(createClientBillingCategory(data)).unwrap();
        showSuccessToast('New billing category added successfully.');
        setIsAddCategoryModalOpen(false);
        await dispatch(fetchBillingFilterOptions()).unwrap();
        const newCategoryName = data.category?.trim();
        if (newCategoryName) {
          setValue('billing_category', newCategoryName, { shouldValidate: true });
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create billing category.' });
      }
    },
    [dispatch, setValue],
  );

  const onSubmit = async (data) => {
    const periodMonth = getMonthNumber(data.billing_month);

    try {
      await dispatch(
        addClientBilling({
          client: data.client,
          center: data.center,
          billing_category: data.billing_category,
          period_month: periodMonth,
          period_year: Number.parseInt(data.billing_year, 10),
          payment_due_date: data.payment_due_date?.trim() || undefined,
        }),
      ).unwrap();

      showSuccessToast('Billing record added successfully');
      onSuccess?.();
      onOpenChange?.(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to add billing. Please try again.' });
    }
  };

  const lockedClientDisplay =
    lockedClientLabel ||
    clientOptions.find((opt) => opt.value === lockedClient)?.label ||
    lockedClient;

  return (
    <>
      <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
        <Modal.Content className='max-w-[640px]' showClose>
          <Modal.Header
            icon={RiMoneyDollarCircleLine}
            title='Add Billing'
            className='py-5 px-8'
            description='Create New Client Billing record .'
          />
          <form onSubmit={handleSubmit(onSubmit)} id='add-billing-form'>
            <Modal.Body className='px-8 py-6 flex flex-col gap-4 max-h-[min(70vh,640px)] overflow-y-auto'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='flex flex-col gap-2'>
                  <Label.Root>
                    Client
                    <Label.Asterisk />
                  </Label.Root>
                  {lockedClient ? (
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Input value={lockedClientDisplay} readOnly disabled />
                      </Input.Wrapper>
                    </Input.Root>
                  ) : (
                    <Controller
                      name='client'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={clientOptions}
                          placeholder='Select client'
                          searchPlaceholder='Search clients...'
                          hasError={Boolean(errors.client)}
                          disabled={isLoading}
                        />
                      )}
                    />
                  )}
                  {errors.client && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.client.message}
                    </Hint.Root>
                  )}
                </div>

                <div className='flex flex-col gap-2'>
                  <Label.Root>
                    Center
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='center'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={centerOptions}
                        placeholder={
                          !selectedClient
                            ? 'Select client first'
                            : centerOptions.length === 0
                              ? 'No centers for client'
                              : 'Select center'
                        }
                        searchPlaceholder='Search centers...'
                        emptyMessage={
                          !selectedClient
                            ? 'Select a client first'
                            : centerOptions.length === 0
                              ? 'No centers for this client'
                              : 'No options available'
                        }
                        noResultsMessage='No centers found'
                        hasError={Boolean(errors.center)}
                        disabled={isLoading || !selectedClient || centerOptions.length === 0}
                      />
                    )}
                  />
                  {errors.center && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.center.message}
                    </Hint.Root>
                  )}
                </div>

                <div className='flex flex-col gap-2 sm:col-span-2'>
                  <Label.Root>
                    Category
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='billing_category'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={field.onChange}
                        open={categoryDropdownOpen}
                        onOpenChange={setCategoryDropdownOpen}
                        hasError={Boolean(errors.billing_category)}
                        disabled={isLoading}
                      >
                        <Select.Trigger className='w-full'>
                          <Select.Value placeholder='Select category' />
                        </Select.Trigger>
                        <Select.Content
                          side='bottom'
                          avoidCollisions={false}
                          className='min-w-[var(--radix-select-trigger-width)]'
                        >
                          <Button.Root
                            type='button'
                            variant='ghost'
                            className='text-green-600 px-[6px] gap-[8px] w-full justify-start'
                            onClick={handleAddCategoryClick}
                          >
                            <Button.Icon as={RiAddLine} />
                            Create new category
                          </Button.Root>
                          {categoryOptions.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.billing_category && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.billing_category.message}
                    </Hint.Root>
                  )}
                </div>

                <div className='grid grid-cols-2 gap-4 sm:col-span-2'>
                  <div className='flex flex-col gap-2 min-w-0'>
                    <Label.Root>
                      Billing Month and Year
                      <Label.Asterisk />
                    </Label.Root>
                    <div className='grid grid-cols-2 gap-2'>
                      <Controller
                        name='billing_month'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isLoading}
                            hasError={Boolean(errors.billing_month)}
                          >
                            <Select.Trigger className='w-full'>
                              <Select.Value placeholder='Month' />
                            </Select.Trigger>
                            <Select.Content>
                              {MONTH_OPTIONS.map((month) => (
                                <Select.Item key={month} value={month}>
                                  {month}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                      <Controller
                        name='billing_year'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isLoading}
                            hasError={Boolean(errors.billing_year)}
                          >
                            <Select.Trigger className='w-full'>
                              <Select.Value placeholder='Year' />
                            </Select.Trigger>
                            <Select.Content>
                              {YEAR_OPTIONS.map((year) => (
                                <Select.Item key={year} value={year}>
                                  {year}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </div>
                  </div>

                  <div className='flex flex-col gap-2 min-w-0'>
                    <Label.Root>Due Date</Label.Root>
                    <Controller
                      name='payment_due_date'
                      control={control}
                      render={({ field }) => (
                        <Datepicker
                          value={
                            field.value
                              ? (() => {
                                  try {
                                    const d = new Date(field.value);
                                    return Number.isNaN(d.getTime()) ? undefined : d;
                                  } catch {
                                    return undefined;
                                  }
                                })()
                              : undefined
                          }
                          onChange={(date) =>
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                          }
                          placeholder='Select due date'
                          size='small'
                          min={minDueDate}
                          hasError={Boolean(errors.payment_due_date)}
                          disabled={isLoading}
                          className='w-full'
                        />
                      )}
                    />
                    {errors.payment_due_date && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.payment_due_date.message}
                      </Hint.Root>
                    )}
                  </div>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className='px-8 py-6 gap-3'>
              <Modal.Close asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='w-full'
                  disabled={isLoading}
                >
                  Cancel
                </Button.Root>
              </Modal.Close>
              <Button.Root
                type='submit'
                variant='primary'
                mode='filled'
                size='small'
                className='w-full'
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                    Adding...
                  </span>
                ) : (
                  'Add Billing'
                )}
              </Button.Root>
            </Modal.Footer>
          </form>
        </Modal.Content>
      </Modal.Root>

      <AddBillingCategoryModal
        isOpen={isAddCategoryModalOpen}
        isLoading={isAddCategoryLoading}
        handleOpenChange={setIsAddCategoryModalOpen}
        handleSave={handleAddBillingCategory}
      />
    </>
  );
};

export default AddBillingModal;
