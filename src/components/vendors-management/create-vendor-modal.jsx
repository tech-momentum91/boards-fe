import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiCloseLine,
  RiAddLine,
  RiDeleteBinLine,
  RiSearchLine,
  RiArrowDownSLine,
} from 'react-icons/ri';
import { State, City } from 'country-state-city';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Dropdown from '@/components/ui/dropdown';
import * as Switch from '@/components/ui/switch';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { PhoneInputController } from '@/components/ui/phone-input';
import { cn } from '@/utils/cn';
import {
  createVendorThunk,
  getVendorOpexCategoriesThunk,
  selectVendorOpexCategories,
} from '@/redux/vendorSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import { vendorCreateSchema, defaultVendorValues } from '@/schemas/vendor-schemas';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { selectCenterAccess, fetchCenterAccess, getCenterListThunk } from '@/redux/centerSlice';
import { Root as Checkbox } from '@/components/ui/checkbox';

const CreateVendorModal = ({
  isOpen,
  isLoading: externalLoading,
  handleOpenChange,
  handleSave: _handleSave,
  onSuccess,
}) => {
  const dispatch = useDispatch();

  const { data: centerListData, isLoading: centerListLoading } = useSelector(
    (state) => state.center.centerListData,
  );

  const centerAccess = useSelector(selectCenterAccess);
  const {
    data: categoryData,
    isLoading: categoryLoading,
    status: categoryStatus,
  } = useSelector(selectVendorOpexCategories);

  const centerSearchInputRef = useRef(null);
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const debouncedCenterSearch = useDebounce(centerSearchQuery, 300);

  const [categorySearch, setCategorySearch] = useState('');
  const [subCategorySearch, setSubCategorySearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(vendorCreateSchema),
    defaultValues: defaultVendorValues,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({ control, name: 'contacts' });

  const allContacts = useWatch({ control, name: 'contacts' });
  const selectedCategory = useWatch({ control, name: 'categories' });
  const selectedState = useWatch({ control, name: 'state' });
  const selectedSubCategories = useWatch({ control, name: 'sub_categories' });

  // ── Derived data ───────────────────────────────────────────────────────────

  const stateOptions = useMemo(
    () => State.getStatesOfCountry('IN').map((s) => ({ value: s.isoCode, label: s.name })),
    [],
  );

  const cityOptions = useMemo(() => {
    if (!selectedState) return [];
    return City.getCitiesOfState('IN', selectedState).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [selectedState]);

  const categoryOptions = useMemo(
    () => categoryData.map((item) => ({ value: item.category, label: item.category })),
    [categoryData],
  );

  const groupedSubCategories = useMemo(() => {
    if (!selectedCategory?.length) return [];
    return selectedCategory
      .map((cat) => {
        const found = categoryData.find((item) => item.category === cat);
        const subs = found?.subcategories || [];
        return {
          category: cat,
          subcategories: subs.map((sub) => ({ value: sub, label: sub })),
        };
      })
      .filter((g) => g.subcategories.length > 0);
  }, [selectedCategory, categoryData]);

  const allSubCategoryValues = useMemo(
    () => groupedSubCategories.flatMap((g) => g.subcategories.map((s) => s.value)),
    [groupedSubCategories],
  );

  const filteredGroupedSubCategories = useMemo(() => {
    if (!subCategorySearch.trim()) return groupedSubCategories;
    const term = subCategorySearch.toLowerCase();
    return groupedSubCategories
      .map((g) => ({
        ...g,
        subcategories: g.subcategories.filter((s) => s.label.toLowerCase().includes(term)),
      }))
      .filter((g) => g.subcategories.length > 0 || g.category.toLowerCase().includes(term));
  }, [groupedSubCategories, subCategorySearch]);

  const filteredCategoryOptions = useMemo(
    () =>
      categoryOptions.filter((o) => o.label.toLowerCase().includes(categorySearch.toLowerCase())),
    [categoryOptions, categorySearch],
  );

  const getCategoryButtonLabel = (selectedValues) => {
    if (categoryLoading) return 'Loading...';
    if (selectedValues.length === 0) return 'Select category';
    if (selectedValues.length === categoryOptions.length && categoryOptions.length > 0)
      return 'All Categories';
    if (selectedValues.length === 1)
      return categoryOptions.find((o) => o.value === selectedValues[0])?.label ?? '1 Category';
    return `${selectedValues.length} Categories`;
  };

  const getSubCategoryButtonLabel = (selectedValues) => {
    if (!selectedCategory?.length) return 'Select category first';
    if (selectedValues.length === 0) return 'Select sub-category';
    if (selectedValues.length === allSubCategoryValues.length && allSubCategoryValues.length > 0)
      return 'All Sub-Categories';
    if (selectedValues.length === 1)
      return allSubCategoryValues.find((v) => v === selectedValues[0]) ?? '1 Sub-Category';
    return `${selectedValues.length} Sub-Categories`;
  };

  const validateSubCategories = useCallback(
    (subCats, categories) => {
      if (!categories?.length) return [];
      return categories.filter((cat) => {
        const group = groupedSubCategories.find((g) => g.category === cat);
        if (!group || group.subcategories.length === 0) return false;
        return !group.subcategories.some((s) => (subCats || []).includes(s.value));
      });
    },
    [groupedSubCategories],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const fetchCenterDropDown = useCallback(
    async (keyword = '') => {
      try {
        await dispatch(getCenterListThunk({ keyword, filters: [] })).unwrap();
      } catch {
        /* silent */
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (!isOpen) {
      reset(defaultVendorValues);
      return;
    }
    if (categoryStatus === 'idle') dispatch(getVendorOpexCategoriesThunk());
  }, [isOpen, categoryStatus, dispatch]);

  const onClose = () => {
    if (!isSubmitting) {
      handleOpenChange?.(false);
      reset(defaultVendorValues);
    }
  };

  const handleRemoveContact = (index) => {
    const contacts = allContacts || [];
    const contactToRemove = contacts[index];
    if (contactToRemove?.is_spoc) {
      const spocCount = contacts.filter((c) => c?.is_spoc).length;
      if (spocCount === 1 && contacts.length > 1) {
        const nextIndex = contacts.findIndex((_, i) => i !== index);
        if (nextIndex !== -1) setValue(`contacts.${nextIndex}.is_spoc`, true);
      }
    }
    removeContact(index);
  };

  const onSubmit = async (formValues) => {
    // console.log('form value', formValues);
    // Guard: each selected category must have ≥1 sub-category selected
    const missing = validateSubCategories(formValues.sub_categories, formValues.categories);
    if (missing.length > 0) {
      setError('sub_categories', {
        type: 'manual',
        message: `Select at least one sub-category for: ${missing.join(', ')}`,
      });
      return;
    }

    // Build a lookup: sub_category_value → its parent category
    // (a sub-category value could theoretically appear under multiple categories,
    //  so we map it to the first matching parent in the grouped data)
    const subToCategoryMap = {};
    groupedSubCategories.forEach((group) => {
      group.subcategories.forEach((sub) => {
        if (!subToCategoryMap[sub.value]) {
          subToCategoryMap[sub.value] = group.category;
        }
      });
    });

    // Each selected sub_category becomes one flat { category, sub_category } entry
    // exactly matching the backend's expected shape
    const custom_vendor_category_mapping = (formValues.sub_categories || []).map((sub) => ({
      category: subToCategoryMap[sub] ?? '',
      sub_category: sub,
    }));

    // Replace the entire custom_centers_payload block with this:

    const allCenterIds = (centerAccess?.data || []).map((c) => c.name);
    const isAllCentersSelected =
      allCenterIds.length > 0 && (formValues.centers || []).length === allCenterIds.length;

    let custom_centers_payload = undefined;

    if (!isAllCentersSelected) {
      const centersByZone = (centerAccess?.data || []).reduce((acc, c) => {
        const zoneName = c.zone || 'Unassigned';
        if (!acc[zoneName]) acc[zoneName] = [];
        acc[zoneName].push(c.name);
        return acc;
      }, {});

      const selectedCenters = formValues.centers || [];

      custom_centers_payload = selectedCenters.map((centerId) => {
        const center = centerAccess?.data?.find((c) => c.name === centerId);
        const zoneName = center?.zone || 'Unassigned';
        const allInZone = centersByZone[zoneName] || [];
        const selectedInZone = selectedCenters.filter((id) => allInZone.includes(id));

        // If all centers in this zone are selected, send zone only (center null)
        if (selectedInZone.length === allInZone.length) {
          return { zone: zoneName, center: null };
        }
        // Otherwise send specific center
        return { zone: zoneName, center: centerId };
      });

      // Deduplicate zone-only rows
      const seen = new Set();
      custom_centers_payload = custom_centers_payload.filter((row) => {
        if (!row.center) {
          if (seen.has(row.zone)) return false;
          seen.add(row.zone);
        }
        return true;
      });
    }

    const payload = {
      supplier_name: formValues.vendor_name,
      custom_state: formValues.state,
      custom_based_city: formValues.city,
      custom_address: formValues.address,
      custom_apply_to_all_centers: isAllCentersSelected ? 1 : 0,
      ...(custom_centers_payload ? { custom_centers: custom_centers_payload } : {}),

      custom_vendor_contacts: (formValues.contacts || []).map((contact) => ({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || '',
        mobile_no: contact.phone,
        is_primary_contact: contact.is_spoc ? 1 : 0,
      })),

      custom_vendor_category_mapping,
    };

    try {
      await dispatch(createVendorThunk(payload)).unwrap();

      showSuccessToast('Vendor created successfully');
      onSuccess?.();
      handleOpenChange?.(false);
      reset(defaultVendorValues);
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  };

  const loading = isSubmitting || externalLoading;

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Content className='max-w-[520px]'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-strong-950'>
                Add New Vendor
              </Drawer.Title>
              <div className='paragraph-small text-text-sub-600'>
                Enter below details to add new vendor.
              </div>
            </div>
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <form onSubmit={handleSubmit(onSubmit)} className='flex size-full flex-col'>
          <Drawer.Body className='flex-1 py-5 overflow-y-auto'>
            {/* ── Basic Information ───────────────────────────────────── */}
            <div className='flex flex-col px-8 gap-4 pb-5'>
              <div className='text-label-sm text-text-strong-950'>Basic Information</div>

              <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                {/* Vendor Name */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Vendor Name <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='vendor_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full' hasError={Boolean(errors.vendor_name)}>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Enter vendor name' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.vendor_name?.message && (
                    <ErrorText>{errors.vendor_name.message}</ErrorText>
                  )}
                </div>

                {/* Centers */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Select Centers <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='centers'
                    control={control}
                    render={({ field }) => (
                      <CenterAccessDropdown
                        centers={centerAccess.data}
                        selectedCenters={field.value || []}
                        onChange={(value) => field.onChange(value)}
                        isLoading={centerAccess.status === 'loading'}
                      />
                    )}
                  />
                  {errors.centers?.message && <ErrorText>{errors.centers.message}</ErrorText>}
                </div>

                {/* Category */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Category <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='categories'
                    control={control}
                    render={({ field }) => {
                      const selectedValues = field.value || [];

                      const toggleValue = (value) => {
                        const isRemoving = selectedValues.includes(value);
                        const updated = isRemoving
                          ? selectedValues.filter((v) => v !== value)
                          : [...selectedValues, value];
                        field.onChange(updated);
                        // When deselecting a category, remove its sub-categories from selection
                        if (isRemoving) {
                          const removedGroup = categoryData.find((item) => item.category === value);
                          const removedSubs = removedGroup?.subcategories || [];
                          setValue(
                            'sub_categories',
                            (selectedSubCategories || []).filter((s) => !removedSubs.includes(s)),
                          );
                        }
                      };

                      const toggleAll = () => {
                        const allIds = categoryOptions.map((o) => o.value);
                        const allSelected = allIds.every((id) => selectedValues.includes(id));
                        field.onChange(allSelected ? [] : allIds);
                        if (allSelected) setValue('sub_categories', []);
                      };

                      const isAllSelected =
                        categoryOptions.length > 0 &&
                        categoryOptions.every((o) => selectedValues.includes(o.value));
                      const isIndeterminate = selectedValues.length > 0 && !isAllSelected;

                      return (
                        <Dropdown.Root
                          onOpenChange={(open) => {
                            if (!open) setCategorySearch('');
                          }}
                        >
                          <Dropdown.Trigger asChild>
                            <Button.Root
                              variant='neutral'
                              mode='stroke'
                              size='small'
                              className='w-full justify-between gap-2 px-3'
                            >
                              <span className='truncate text-label-sm text-text-strong-950'>
                                {getCategoryButtonLabel(selectedValues)}
                              </span>
                              <RiArrowDownSLine className='size-4 shrink-0 text-text-strong-950' />
                            </Button.Root>
                          </Dropdown.Trigger>

                          <Dropdown.Content
                            align='start'
                            sideOffset={8}
                            className='w-(--radix-popper-anchor-width) min-w-[200px]'
                          >
                            <div className='flex flex-col gap-3'>
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Icon>
                                    <RiSearchLine />
                                  </Input.Icon>
                                  <Input.Input
                                    placeholder='Search categories...'
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                  />
                                </Input.Wrapper>
                              </Input.Root>

                              <Dropdown.Item
                                className='flex items-center gap-3 rounded-lg px-2 py-2'
                                onSelect={(e) => {
                                  e.preventDefault();
                                  toggleAll();
                                }}
                              >
                                <Checkbox
                                  checked={
                                    isAllSelected ? true : isIndeterminate ? 'indeterminate' : false
                                  }
                                  readOnly
                                />
                                <div className='flex items-center gap-2'>
                                  <span className='text-paragraph-sm text-text-strong-950'>
                                    All Categories
                                  </span>
                                  <span className='text-paragraph-xs text-text-soft-400'>
                                    ({categoryOptions.length})
                                  </span>
                                </div>
                              </Dropdown.Item>

                              <div className='flex max-h-[240px] flex-col gap-1 overflow-y-auto pr-1'>
                                {filteredCategoryOptions.length === 0 ? (
                                  <p className='px-2 py-2 text-paragraph-sm text-text-soft-400'>
                                    No categories found
                                  </p>
                                ) : (
                                  filteredCategoryOptions.map((opt) => {
                                    const checked = selectedValues.includes(opt.value);
                                    return (
                                      <Dropdown.Item
                                        key={opt.value}
                                        className={cn(
                                          'flex items-center gap-3 rounded-lg px-2 py-2',
                                          checked && 'bg-bg-weak-100',
                                        )}
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          toggleValue(opt.value);
                                        }}
                                      >
                                        <Checkbox checked={checked} readOnly />
                                        <span className='text-paragraph-sm text-text-strong-950 truncate'>
                                          {opt.label}
                                        </span>
                                      </Dropdown.Item>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </Dropdown.Content>
                        </Dropdown.Root>
                      );
                    }}
                  />
                  {errors.categories?.message && <ErrorText>{errors.categories.message}</ErrorText>}
                </div>

                {/* Sub-Category */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Sub-Category <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='sub_categories'
                    control={control}
                    render={({ field }) => {
                      const selectedValues = field.value || [];
                      const isDisabled = !selectedCategory?.length;

                      const toggleValue = (value) => {
                        const updated = selectedValues.includes(value)
                          ? selectedValues.filter((v) => v !== value)
                          : [...selectedValues, value];
                        field.onChange(updated);
                      };

                      const toggleGroup = (group) => {
                        const groupIds = group.subcategories.map((s) => s.value);
                        const allGroupSelected = groupIds.every((id) =>
                          selectedValues.includes(id),
                        );
                        const updated = allGroupSelected
                          ? selectedValues.filter((v) => !groupIds.includes(v))
                          : [...new Set([...selectedValues, ...groupIds])];
                        field.onChange(updated);
                      };

                      const toggleAll = () => {
                        const allSelected = allSubCategoryValues.every((id) =>
                          selectedValues.includes(id),
                        );
                        field.onChange(allSelected ? [] : [...allSubCategoryValues]);
                      };

                      const isAllSelected =
                        allSubCategoryValues.length > 0 &&
                        allSubCategoryValues.every((id) => selectedValues.includes(id));
                      const isIndeterminate = selectedValues.length > 0 && !isAllSelected;

                      return (
                        <Dropdown.Root
                          onOpenChange={(open) => {
                            if (!open) {
                              setSubCategorySearch('');
                              setCollapsedGroups({});
                            }
                          }}
                        >
                          <Dropdown.Trigger asChild disabled={isDisabled}>
                            <Button.Root
                              variant='neutral'
                              mode='stroke'
                              size='small'
                              disabled={isDisabled}
                              className='w-full justify-between gap-2 px-3'
                            >
                              <span className='truncate text-label-sm text-text-strong-950'>
                                {getSubCategoryButtonLabel(selectedValues)}
                              </span>
                              <RiArrowDownSLine className='size-4 shrink-0 text-text-strong-950' />
                            </Button.Root>
                          </Dropdown.Trigger>

                          <Dropdown.Content
                            align='start'
                            sideOffset={8}
                            className='w-(--radix-popper-anchor-width) min-w-[200px]'
                          >
                            <div className='flex flex-col gap-3'>
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Icon>
                                    <RiSearchLine />
                                  </Input.Icon>
                                  <Input.Input
                                    placeholder='Search sub-categories...'
                                    value={subCategorySearch}
                                    onChange={(e) => setSubCategorySearch(e.target.value)}
                                  />
                                </Input.Wrapper>
                              </Input.Root>

                              <Dropdown.Item
                                className='flex items-center gap-3 rounded-lg px-2 py-2'
                                onSelect={(e) => {
                                  e.preventDefault();
                                  toggleAll();
                                }}
                              >
                                <Checkbox
                                  checked={
                                    isAllSelected ? true : isIndeterminate ? 'indeterminate' : false
                                  }
                                  readOnly
                                />
                                <div className='flex items-center gap-2'>
                                  <span className='text-paragraph-sm text-text-strong-950'>
                                    All Sub-Categories
                                  </span>
                                  <span className='text-paragraph-xs text-text-soft-400'>
                                    ({allSubCategoryValues.length})
                                  </span>
                                </div>
                              </Dropdown.Item>

                              <div className='flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1'>
                                {filteredGroupedSubCategories.length === 0 ? (
                                  <p className='px-2 py-2 text-paragraph-sm text-text-soft-400'>
                                    No sub-categories found
                                  </p>
                                ) : (
                                  filteredGroupedSubCategories.map((group) => {
                                    const groupIds = group.subcategories.map((s) => s.value);
                                    const selectedInGroup = groupIds.filter((id) =>
                                      selectedValues.includes(id),
                                    ).length;
                                    const groupAllSelected = selectedInGroup === groupIds.length;
                                    const groupIndeterminate =
                                      selectedInGroup > 0 && !groupAllSelected;
                                    const isCollapsed = collapsedGroups[group.category];

                                    return (
                                      <div key={group.category} className='flex flex-col gap-1'>
                                        <Dropdown.Item
                                          className='flex items-center gap-2 rounded-lg px-2 py-2 text-text-soft-400 hover:bg-bg-weak-50'
                                          onSelect={(e) => {
                                            e.preventDefault();
                                            setCollapsedGroups((previous) => ({
                                              ...previous,
                                              [group.category]: !previous[group.category],
                                            }));
                                          }}
                                        >
                                          <div
                                            className='flex items-center'
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleGroup(group);
                                            }}
                                          >
                                            <Checkbox
                                              checked={
                                                groupAllSelected
                                                  ? true
                                                  : groupIndeterminate
                                                    ? 'indeterminate'
                                                    : false
                                              }
                                              readOnly
                                            />
                                          </div>
                                          <span className='text-[11px] font-medium uppercase tracking-[0.08em] flex-1 cursor-pointer'>
                                            {group.category}
                                          </span>
                                          <RiArrowDownSLine
                                            className={cn(
                                              'size-4 transition-transform',
                                              isCollapsed ? '-rotate-90' : 'rotate-0',
                                            )}
                                          />
                                        </Dropdown.Item>

                                        {!isCollapsed &&
                                          group.subcategories.map((sub) => {
                                            const checked = selectedValues.includes(sub.value);
                                            return (
                                              <Dropdown.Item
                                                key={sub.value}
                                                className={cn(
                                                  'flex items-center gap-3 rounded-lg px-2 py-2 pl-6',
                                                  checked && 'bg-bg-weak-100',
                                                )}
                                                onSelect={(e) => {
                                                  e.preventDefault();
                                                  toggleValue(sub.value);
                                                }}
                                              >
                                                <Checkbox checked={checked} readOnly />
                                                <span className='text-paragraph-sm text-text-strong-950 truncate flex-1'>
                                                  {sub.label}
                                                </span>
                                              </Dropdown.Item>
                                            );
                                          })}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </Dropdown.Content>
                        </Dropdown.Root>
                      );
                    }}
                  />
                  {errors.sub_categories?.message && (
                    <ErrorText>{errors.sub_categories.message}</ErrorText>
                  )}
                </div>
              </div>
            </div>

            <div className='border-b border-stroke-soft-200 px-8' />

            {/* ── Contact Details ─────────────────────────────────────── */}
            <div className='flex flex-col px-8 gap-4 py-5'>
              <div className='flex items-center justify-between'>
                <div className='text-label-sm text-text-strong-950'>Contact Details</div>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  type='button'
                  onClick={() =>
                    appendContact({
                      first_name: '',
                      last_name: '',
                      email: '',
                      phone: '',
                      is_spoc: false,
                    })
                  }
                >
                  <Button.Icon as={RiAddLine} className='mr-0.5' />
                  Add Contact
                </Button.Root>
              </div>

              {errors.contacts?.message && <ErrorText>{errors.contacts.message}</ErrorText>}

              <div className='flex flex-col gap-4'>
                {contactFields.map((contact, index) => {
                  const contactErrors = errors.contacts?.[index];
                  return (
                    <div key={contact.id} className='rounded-xl border border-stroke-soft-200'>
                      {/* Contact header */}
                      <div className='flex items-center justify-between px-2 py-[10px] rounded-t-xl bg-bg-weak-100'>
                        <span className='text-label-xs text-text-sub-500'>CONTACT {index + 1}</span>
                        <div className='flex items-center gap-2'>
                          <Controller
                            name={`contacts.${index}.is_spoc`}
                            control={control}
                            render={({ field }) => (
                              <Switch.Root
                                id={`contacts.${index}.is_spoc`}
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    const spocCount = (allContacts || []).filter(
                                      (c) => c?.is_spoc,
                                    ).length;
                                    if (spocCount === 1) return;
                                  }
                                  if (checked) {
                                    contactFields.forEach((_, i) => {
                                      if (i !== index) setValue(`contacts.${i}.is_spoc`, false);
                                    });
                                  }
                                  field.onChange(checked);
                                }}
                              />
                            )}
                          />
                          <Label.Root
                            htmlFor={`contacts.${index}.is_spoc`}
                            className='text-label-sm text-text-main-900'
                          >
                            SPOC
                          </Label.Root>
                          {contactFields.length > 1 && (
                            <>
                              <div className='w-px h-4 bg-stroke-sub-300' />
                              <CompactButton.Root
                                type='button'
                                size='medium'
                                variant='ghost'
                                onClick={() => handleRemoveContact(index)}
                                className='text-text-sub-500'
                              >
                                <CompactButton.Icon as={RiDeleteBinLine} />
                              </CompactButton.Root>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Contact fields */}
                      <div className='border-t border-stroke-soft-200 rounded-b-xl bg-white p-4'>
                        <div className='grid grid-cols-2 gap-3'>
                          {/* Name — full width */}
                          {/* First Name */}
                          <div className='flex flex-col gap-1'>
                            <Label.Root>
                              First Name <Label.Asterisk />
                            </Label.Root>
                            <Input.Root hasError={Boolean(contactErrors?.first_name)}>
                              <Input.Wrapper>
                                <Controller
                                  name={`contacts.${index}.first_name`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input.Input {...field} placeholder='Enter first name' />
                                  )}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                            {contactErrors?.first_name?.message && (
                              <ErrorText>{contactErrors.first_name.message}</ErrorText>
                            )}
                          </div>

                          {/* Last Name */}
                          <div className='flex flex-col gap-1'>
                            <Label.Root>
                              Last Name <Label.Asterisk />
                            </Label.Root>
                            <Input.Root hasError={Boolean(contactErrors?.last_name)}>
                              <Input.Wrapper>
                                <Controller
                                  name={`contacts.${index}.last_name`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input.Input {...field} placeholder='Enter last name' />
                                  )}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                            {contactErrors?.last_name?.message && (
                              <ErrorText>{contactErrors.last_name.message}</ErrorText>
                            )}
                          </div>

                          {/* Email */}
                          <div className='flex flex-col gap-1'>
                            <Label.Root>
                              Email <Label.Asterisk />
                            </Label.Root>
                            <Input.Root hasError={Boolean(contactErrors?.email)}>
                              <Input.Wrapper>
                                <Controller
                                  name={`contacts.${index}.email`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input.Input
                                      {...field}
                                      type='email'
                                      placeholder='Enter email'
                                    />
                                  )}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                            {contactErrors?.email?.message && (
                              <ErrorText>{contactErrors.email.message}</ErrorText>
                            )}
                          </div>

                          {/* Phone */}
                          <div className='flex flex-col gap-1'>
                            <Label.Root>
                              Phone <Label.Asterisk />
                            </Label.Root>
                            <Controller
                              name={`contacts.${index}.phone`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <PhoneInputController
                                  value={field.value}
                                  onChange={field.onChange}
                                  error={fieldState.error}
                                  placeholder='9876500011'
                                  maxLength={10}
                                  disabled={isSubmitting}
                                />
                              )}
                            />
                            {contactErrors?.phone?.message && (
                              <ErrorText>{contactErrors.phone.message}</ErrorText>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='border-b border-stroke-soft-200 px-8' />

            {/* ── Location ────────────────────────────────────────────── */}
            <div className='flex flex-col px-8 gap-4 py-5'>
              <div className='text-label-sm text-text-strong-950'>Location</div>

              <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                {/* State */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    State <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='state'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue('city', '');
                        }}
                        hasError={Boolean(errors.state)}
                        options={stateOptions}
                        placeholder='Select state'
                        triggerClassName='w-full'
                      />
                    )}
                  />
                  {errors.state?.message && <ErrorText>{errors.state.message}</ErrorText>}
                </div>

                {/* City */}
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    City <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='city'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!selectedState}
                        hasError={Boolean(errors.city)}
                        options={cityOptions}
                        placeholder={selectedState ? 'Select city' : 'Select state first'}
                        triggerClassName='w-full'
                      />
                    )}
                  />
                  {errors.city?.message && <ErrorText>{errors.city.message}</ErrorText>}
                </div>

                {/* Address */}
                <div className='flex flex-col gap-1 col-span-2'>
                  <Label.Root>Address</Label.Root>
                  <Controller
                    name='address'
                    control={control}
                    render={({ field }) => (
                      <Input.Root className='w-full'>
                        <Input.Wrapper>
                          <Input.Input
                            as='textarea'
                            {...field}
                            rows={5}
                            placeholder='Enter address'
                            className='resize-none'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </div>
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
            <div className='px-8 py-4 bg-bg-white-0'>
              <div className='flex items-center justify-between gap-3'>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button.Root>
                <Button.Root type='submit' disabled={loading}>
                  {loading ? 'Creating...' : 'Create'}
                </Button.Root>
              </div>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateVendorModal;
