import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiFileListLine, RiErrorWarningFill, RiAddLine, RiArrowLeftLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Badge from '@/components/ui/badge';
import * as Hint from '@/components/ui/hint';
import * as Checkbox from '@/components/ui/checkbox';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { selectCenterAccess, fetchCenterAccess } from '@/redux/centerSlice';
import { createClientOpexParentCategory, fetchClientOpexCategoryDetail } from '@/redux/opexSlice';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { showErrorToast } from '@/utils/error-utils';
import {
  DEFAULT_STATUS_OPTIONS,
  TYPE_OPTIONS,
  EXPENSE_MONTH_BASIS,
} from '@/components/opex/constants';

const editOpexSchema = z
  .object({
    category: z.string().optional(),
    newCategory: z.string().optional(),
    isSelectMode: z.boolean().default(true),
    subcategory: z.string().min(1, 'Subcategory is required'),
    status: z.string().min(1, 'Status is required'),
    type: z.string().min(1, 'Type is required'),
    allCenters: z.boolean().default(true),
    centers: z.array(z.string()).optional(),
    expense_month_basis: z.string().min(1, 'Expense month basis is required'),
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

const EditOpexModal = ({
  isOpen,
  isLoading,
  handleOpenChange,
  handleSave,
  opexData,
  categoryOptions = [],
  statusOptions = DEFAULT_STATUS_OPTIONS,
}) => {
  const dispatch = useDispatch();
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [selectDropdownOpen, setSelectDropdownOpen] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(editOpexSchema),
    defaultValues: {
      category: '',
      newCategory: '',
      isSelectMode: true,
      subcategory: '',
      status: 'Active',
      type: '',
      allCenters: true,
      centers: [],
      expense_month_basis: '',
    },
  });

  const selectedStatus = watch('status');
  const selectedType = watch('type');
  const selectedCategory = watch('category');
  const isSelectMode = watch('isSelectMode');
  const selectedExpenseMonthBasis = watch('expense_month_basis');
  const centerAccess = useSelector(selectCenterAccess);

  useEffect(() => {
    if (isOpen && centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [isOpen, dispatch, centerAccess.status]);

  // Populate form with existing data when modal opens
  useEffect(() => {
    if (isOpen && opexData?.name) {
      setIsFetchingDetail(true);
      // Reset to defaults first
      reset({
        category: opexData.parent_opex_category || '',
        newCategory: '',
        isSelectMode: true,
        subcategory: opexData.name || '',
        status: opexData.status || 'Active',
        type: opexData.type || '',
        allCenters: true,
        centers: [],
        expense_month_basis: opexData.expense_month_basis || '',
      });

      dispatch(fetchClientOpexCategoryDetail(opexData.name))
        .unwrap()
        .then((data) => {
          const isAll = data.apply_to_all_centers === 1;
          const centerIds = data.centers ? data.centers.map((c) => c.center) : [];

          reset({
            category: data.parent_opex_category || '',
            newCategory: '',
            isSelectMode: true,
            subcategory: data.name || '',
            status: data.status || 'Active',
            type: data.type || '',
            allCenters: isAll,
            centers: centerIds,
            expense_month_basis: data.expense_month_basis || '',
          });
        })
        .catch((error) => {
          showErrorToast(error, {
            defaultMessage: 'Failed to fetch OPEX category detail. Please try again.',
          });
          // Fallback to basic data provided in props
          reset({
            category: opexData.parent_opex_category || '',
            newCategory: '',
            isSelectMode: true,
            subcategory: opexData.name || '',
            status: opexData.status || 'Active',
            type: opexData.type || '',
            allCenters: true,
            centers: [],
            expense_month_basis: opexData.expense_month_basis || '',
          });
        })
        .finally(() => {
          setIsFetchingDetail(false);
        });
    } else if (!isOpen) {
      reset({
        category: '',
        newCategory: '',
        isSelectMode: true,
        subcategory: '',
        status: 'Active',
        type: '',
        allCenters: true,
        centers: [],
        expense_month_basis: '',
      });
      setIsFetchingDetail(false);
      setAddCategoryOpen(false);
      setSelectDropdownOpen(false);
    }
  }, [isOpen, opexData?.name, dispatch, reset]);

  useEffect(() => {
    setValue('isSelectMode', !addCategoryOpen);
  }, [addCategoryOpen, setValue]);

  const handleAddCategoryClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAddCategoryOpen(true);
    setSelectDropdownOpen(false);
  };

  const onSubmit = async (data) => {
    try {
      const resolvedCategory = data.isSelectMode ? data.category : data.newCategory;
      if (!data.isSelectMode) {
        await dispatch(createClientOpexParentCategory({ category: data.newCategory })).unwrap();
      }

      const finalData = {
        name: opexData?.name,
        parent_opex_category: opexData?.parent_opex_category,
        subcategory: data.subcategory,
        category: resolvedCategory,
        status: data.status,
        type: data.type,
        apply_to_all_centers: data.allCenters ? 1 : 0,
        expense_month_basis: data.expense_month_basis,
      };

      finalData.centers = data.allCenters
        ? []
        : (data.centers || []).map((centerId) => ({
            center: centerId,
          }));

      handleSave(finalData);
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to update category. Please try again.',
      });
    }
  };

  const isPageLoading = isLoading || isFetchingDetail;

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[440px]'>
        <Modal.Header
          icon={RiFileListLine}
          title='Edit OPEX'
          className='py-5 px-8 gap-4'
          description='Edit below OPEX details.'
        />
        <Modal.Body className='px-8 py-6'>
          <form
            id='edit-opex-form'
            onSubmit={handleSubmit(onSubmit)}
            className='w-full flex flex-col gap-4'
          >
            {/* Category */}
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
                        value={watch('newCategory')}
                        onChange={(e) =>
                          setValue('newCategory', e.target.value, { shouldValidate: true })
                        }
                        disabled={isPageLoading}
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
                      setValue('isSelectMode', true);
                    }}
                    disabled={isPageLoading}
                    hasError={Boolean(errors.category) && isSelectMode}
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

            {/* Subcategory */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>Subcategory</Label.Root>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input
                    value={watch('subcategory')}
                    disabled={isPageLoading}
                    onChange={(e) =>
                      setValue('subcategory', e.target.value, { shouldValidate: true })
                    }
                  />
                </Input.Wrapper>
              </Input.Root>

              {errors.subcategory && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.subcategory.message}
                </Hint.Root>
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
                disabled={isPageLoading}
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
                disabled={isPageLoading}
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
                  setValue('expense_month_basis', value, { shouldValidate: true })
                }
                disabled={isPageLoading}
                hasError={Boolean(errors.expense_month_basis)}
                options={EXPENSE_MONTH_BASIS}
                placeholder='Select basis'
                showArrow={true}
              />

              {errors.expense_month_basis && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.expense_month_basis.message}
                </Hint.Root>
              )}
            </div>

            {/* All Centers Checkbox */}
            <div className='flex items-center gap-2'>
              <Checkbox.Root
                id='edit_allCenters'
                checked={watch('allCenters')}
                onCheckedChange={(checked) => setValue('allCenters', checked)}
                disabled={isPageLoading}
              />
              <Label.Root htmlFor='edit_allCenters' className='cursor-pointer select-none'>
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
        <Modal.Footer>
          <Modal.Close asChild>
            <Button.Root variant='neutral' className='w-full' mode='stroke' size='small'>
              Cancel
            </Button.Root>
          </Modal.Close>

          <Button.Root
            variant='primary'
            className='w-full'
            mode='filled'
            size='small'
            disabled={isPageLoading}
            type='submit'
            form='edit-opex-form'
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Saving...
              </span>
            ) : (
              'Save'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default EditOpexModal;
