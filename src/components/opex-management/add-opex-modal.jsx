import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiFileListLine, RiErrorWarningFill, RiAddLine, RiArrowLeftLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Badge from '@/components/ui/badge';
import * as Hint from '@/components/ui/hint';
import { z } from 'zod';
import * as Input from '@/components/ui/input';
import * as Checkbox from '@/components/ui/checkbox';
import { showErrorToast } from '@/utils/error-utils';
import { createClientOpexParentCategory } from '@/redux/opexSlice';
import { selectCenterAccess, fetchCenterAccess } from '@/redux/centerSlice';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { useSelector, useDispatch } from 'react-redux';
import * as LinkButton from '@/components/ui/link-button';
import {
  DEFAULT_STATUS_OPTIONS,
  TYPE_OPTIONS,
  EXPENSE_MONTH_BASIS,
} from '@/components/opex/constants';

const addOpexSchema = z
  .object({
    Name: z
      .string()
      .min(1, 'Full Name is required')
      .min(2, 'Full Name must be at least 2 characters'),

    category: z.string().optional(),

    newCategory: z.string().optional(),

    status: z.string().min(1, 'Status is required'),

    type: z.string().min(1, 'Type is required'),

    isSelectMode: z.boolean(),

    allCenters: z.boolean().default(true),

    centers: z.array(z.string()).optional(),

    expenseMonthBasis: z.string().min(1, 'Expense Month Basis is required'),
  })
  .superRefine((data, context) => {
    if (!data.allCenters && (!data.centers || data.centers.length === 0)) {
      context.addIssue({
        path: ['centers'],
        message: 'Please select at least one center',
        code: z.ZodIssueCode.custom,
      });
    }

    if (data.isSelectMode) {
      if (!data.category || data.category.trim() === '') {
        context.addIssue({
          path: ['category'],
          message: 'Category is required',
          code: z.ZodIssueCode.custom,
        });
      }
    } else {
      if (!data.newCategory || data.newCategory.trim() === '') {
        context.addIssue({
          path: ['newCategory'],
          message: 'Category is required',
          code: z.ZodIssueCode.custom,
        });
      } else if (data.newCategory.trim().length < 2) {
        context.addIssue({
          path: ['newCategory'],
          message: 'Category must be at least 2 characters',
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

const AddOpexModal = ({
  isOpen,
  isLoading,
  handleOpenChange,
  handleSave,
  categoryOptions,
  statusOptions = DEFAULT_STATUS_OPTIONS,
}) => {
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(addOpexSchema),
    defaultValues: {
      Name: '',
      category: '',
      newCategory: '',
      status: 'Active',
      type: '',
      isSelectMode: true,
      allCenters: true,
      centers: [],
      expenseMonthBasis: '',
    },
  });

  const centerAccess = useSelector(selectCenterAccess);
  const selectedCenters = watch('centers');

  const selectedCategory = watch('category');
  const selectedStatus = watch('status');
  const selectedType = watch('type');
  const isSelectMode = watch('isSelectMode');

  const selectedExpenseMonthBasis = watch('expenseMonthBasis');

  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [selectDropdownOpen, setSelectDropdownOpen] = React.useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setAddCategoryOpen(false);
      setSelectDropdownOpen(false);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (isOpen && centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [isOpen, dispatch, centerAccess.status]);

  useEffect(() => {
    setValue('isSelectMode', !addCategoryOpen);
  }, [addCategoryOpen, setValue]);

  const handleAddCategoryClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAddCategoryOpen(true);
    setSelectDropdownOpen(false);
    setValue('category', '', { shouldValidate: false });
  };

  const onSubmit = async (data) => {
    try {
      if (data.Name === data.newCategory) {
        throw new Error('name and category name should be different');
      } else {
        const finalData = {
          ...data,
          category: data.isSelectMode ? data.category : data.newCategory,
          apply_to_all_centers: data.allCenters ? 1 : 0,
          expense_month_basis: data.expenseMonthBasis,
        };

        if (data.allCenters) {
          delete finalData.centers;
        } else {
          finalData.centers = (data.centers || []).map((centerId) => ({
            center: centerId,
          }));
        }

        delete finalData.newCategory;
        delete finalData.isSelectMode;
        delete finalData.allCenters;
        delete finalData.expenseMonthBasis;

        if (!data.isSelectMode) {
          await dispatch(createClientOpexParentCategory({ category: data.newCategory })).unwrap();
        }
        handleSave(finalData);
      }
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to create OPEX. Please try again.',
      });
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[440px]'>
        <Modal.Header
          icon={RiFileListLine}
          title='Create New OPEX'
          className='py-5 px-8 gap-4'
          description='Add below details to create a new operational expense.'
        />
        <Modal.Body className='px-8 py-6'>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Name
                <Label.Asterisk />
              </Label.Root>
              <Input.Root size='medium' className='w-full' hasError={Boolean(errors.Name)}>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='Enter name'
                    {...register('Name')}
                    disabled={isLoading}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.Name && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.Name.message}
                </Hint.Root>
              )}
            </div>

            {/* Category: show either "Select existing" or "Create new" — one at a time */}
            <div className='w-full flex flex-col gap-2'>
              {addCategoryOpen ? (
                <>
                  <Label.Root>
                    New category name
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root
                    size='medium'
                    className='w-full'
                    hasError={Boolean(errors.newCategory)}
                  >
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder='Enter new category name'
                        {...register('newCategory')}
                        disabled={isLoading}
                        autoFocus
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.newCategory && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.newCategory.message}
                    </Hint.Root>
                  )}
                  <LinkButton.Root
                    type='button'
                    variant='primary'
                    onClick={() => {
                      setAddCategoryOpen(false);
                      setValue('isSelectMode', true);
                      setValue('newCategory', '', { shouldValidate: false });
                      setSelectDropdownOpen(false);
                    }}
                    className='w-full justify-start'
                  >
                    <RiArrowLeftLine /> Choose from existing categories
                  </LinkButton.Root>
                </>
              ) : (
                <>
                  <div className='flex items-center justify-between'>
                    <Label.Root>
                      Category
                      <Label.Asterisk />
                    </Label.Root>
                    <LinkButton.Root
                      type='button'
                      variant='primary'
                      onClick={handleAddCategoryClick}
                      className='label-xsmall font-medium text-green-600'
                    >
                      <RiAddLine size={16} /> Create new category
                    </LinkButton.Root>
                  </div>
                  <SearchableSelect
                    value={selectedCategory}
                    onValueChange={(value) => {
                      setValue('category', value, { shouldValidate: true });
                      setValue('newCategory', '', { shouldValidate: false });
                      setValue('isSelectMode', true);
                    }}
                    hasError={Boolean(errors.category) && isSelectMode}
                    disabled={isLoading}
                    options={categoryOptions?.map((option) => option.category) || []}
                    placeholder='Select a category'
                    showArrow={true}
                  />
                  {errors.category && isSelectMode && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.category.message}
                    </Hint.Root>
                  )}
                </>
              )}
            </div>

            {/* Type */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Type
                <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                value={selectedType}
                onValueChange={(value) => setValue('type', value, { shouldValidate: true })}
                disabled={isLoading}
                hasError={Boolean(errors.type)}
                options={TYPE_OPTIONS}
                placeholder='Select type'
                showArrow={true}
              />
              {errors.type && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.type.message}
                </Hint.Root>
              )}
            </div>

            {/* Status */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>Status</Label.Root>
              <SearchableSelect
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value)}
                disabled={isLoading}
                options={statusOptions}
                placeholder='Select'
                showArrow={true}
                renderTrigger={({ selectedOption }) => (
                  <Badge.Root
                    size='small'
                    variant='light'
                    color={selectedStatus === 'Active' ? 'green' : 'gray'}
                  >
                    {selectedStatus}
                  </Badge.Root>
                )}
                renderOptionLabel={(option) => (
                  <Badge.Root
                    size='small'
                    variant='light'
                    color={option.value === 'Active' ? 'green' : 'gray'}
                  >
                    {option.label}
                  </Badge.Root>
                )}
              />
            </div>

            {/* Expense Month Basis */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Expense Month Basis
                <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                value={selectedExpenseMonthBasis}
                onValueChange={(value) =>
                  setValue('expenseMonthBasis', value, { shouldValidate: true })
                }
                disabled={isLoading}
                hasError={Boolean(errors.expenseMonthBasis)}
                options={EXPENSE_MONTH_BASIS}
                placeholder='Select Expense Month Basis'
                showArrow={true}
              />
              {errors.expenseMonthBasis && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.expenseMonthBasis.message}
                </Hint.Root>
              )}
            </div>

            {/* All Centers Checkbox */}
            <div className='flex items-center gap-2'>
              <Checkbox.Root
                id='allCenters'
                checked={watch('allCenters')}
                onCheckedChange={(checked) => setValue('allCenters', checked)}
                disabled={isLoading}
              />
              <Label.Root htmlFor='allCenters' className='cursor-pointer select-none'>
                All Centers
              </Label.Root>
            </div>

            {!watch('allCenters') && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Select Centers
                  <Label.Asterisk />
                </Label.Root>
                <CenterAccessDropdown
                  centers={centerAccess.data}
                  selectedCenters={watch('centers') || []}
                  onChange={(value) => {
                    setValue('centers', value, { shouldValidate: true });
                  }}
                  isLoading={centerAccess.status === 'loading'}
                />
                {errors.centers && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.centers.message}
                  </Hint.Root>
                )}
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer className='px-8 py-6 gap-3'>
          <Modal.Close asChild>
            <Button.Root variant='neutral' className='w-full' mode='stroke' size='small'>
              Cancel
            </Button.Root>
          </Modal.Close>

          <Button.Root
            onClick={handleSubmit(onSubmit)}
            variant='primary'
            className='w-full'
            mode='filled'
            size='small'
            disabled={isLoading}
            type='button'
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Adding...
              </span>
            ) : (
              'Add'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddOpexModal;
