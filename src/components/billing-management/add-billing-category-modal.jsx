import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiFileListLine,
  RiErrorWarningFill,
  RiBuilding2Line,
  RiBuildingLine,
} from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Badge from '@/components/ui/badge';
import * as Hint from '@/components/ui/hint';
import * as Input from '@/components/ui/input';
import * as Checkbox from '@/components/ui/checkbox';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { fetchCenterWiseClientsThunk, fetchClients } from '@/redux/billingSlice';

const DEFAULT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const clientEntrySchema = z.object({
  center: z.string(),
  client: z.string(),
});

const addBillingCategorySchema = z
  .object({
    category: z
      .string()
      .min(1, 'Category name is required')
      .min(2, 'Category must be at least 2 characters'),
    status: z.string().min(1, 'Status is required'),
    allClients: z.boolean().default(true),
    clients: z.array(clientEntrySchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.allClients && (!data.clients || data.clients.length === 0)) {
      ctx.addIssue({
        path: ['clients'],
        message: 'Please select at least one client',
        code: z.ZodIssueCode.custom,
      });
    }
  });

const AddBillingCategoryModal = ({
  isOpen,
  isLoading,
  handleOpenChange,
  handleSave,
  categoryOptions = [],
  statusOptions = DEFAULT_STATUS_OPTIONS,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(addBillingCategorySchema),
    defaultValues: {
      category: '',
      status: 'Active',
      allClients: true,
      clients: [],
    },
  });

  const selectedStatus = watch('status');
  const allClients = watch('allClients');
  const selectedClients = watch('clients');
  const selectedClientsCount = Array.isArray(selectedClients) ? selectedClients.length : 0;
  const [clientSearchText, setClientSearchText] = useState('');

  const dispatch = useDispatch();
  const clientList = useSelector((state) => state.billing.clientList?.data);
  const clientData = clientList?.data || clientList || [];

  const centerClients = useSelector((state) => state.billing.centerWiseClients?.data?.message);

  const clientOptions =
    Array.isArray(clientData) && clientData.length > 0
      ? clientData.map((client) => ({
          value: client.name,
          label: client.customer_name || client.name,
        }))
      : [];

  useEffect(() => {
    if (!isOpen) {
      reset({
        category: '',
        status: 'Active',
        allClients: true,
        clients: [],
      });
      setClientSearchText('');
    }
  }, [isOpen, reset]);

  useEffect(() => {
    dispatch(fetchClients());
    dispatch(fetchCenterWiseClientsThunk());
  }, [dispatch]);

  const onSubmit = (data) => {
    const payload = {
      category: data.category.trim(),
      status: data.status,
      apply_to_all_clients: data.allClients ? 1 : 0,
    };

    if (!data.allClients && Array.isArray(data.clients) && data.clients.length > 0) {
      payload.clients = data.clients;
    }

    // console.log('payload', payload);

    handleSave(payload);
  };

  const filteredCenterGroups = useMemo(() => {
    const query = clientSearchText.trim().toLowerCase();
    const groups = centerClients?.groups || [];
    if (!query) return groups;

    return groups
      .map((group) => {
        const centerName = String(group?.center_name || '').toLowerCase();
        const centerMatches = centerName.includes(query);
        const clients = Array.isArray(group?.clients) ? group.clients : [];
        const filteredClients = centerMatches
          ? clients
          : clients.filter((c) =>
              String(c?.name || '')
                .toLowerCase()
                .includes(query),
            );
        return { ...group, clients: filteredClients, __centerMatches: centerMatches };
      })
      .filter((group) => group.__centerMatches || (group.clients || []).length > 0);
  }, [centerClients?.groups, clientSearchText]);

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiFileListLine}
          title='Create Billing Category'
          className='py-5 px-8'
          description='Add below details to create a new billing category.'
        />
        <Modal.Body className='px-8 py-6'>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Category Name
                <Label.Asterisk />
              </Label.Root>
              <Input.Root size='medium' className='w-full' hasError={Boolean(errors.category)}>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='Enter category name'
                    {...register('category')}
                    disabled={isLoading}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.category && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.category.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>Status</Label.Root>
              <SearchableSelect
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value)}
                disabled={isLoading}
                options={statusOptions}
                placeholder='Select'
                showArrow={true}
                renderTrigger={({ selectedOption }) =>
                  selectedStatus ? (
                    <Badge.Root
                      size='small'
                      variant='light'
                      color={selectedStatus === 'Active' ? 'green' : 'gray'}
                      className='text-nowrap'
                    >
                      {selectedStatus}
                    </Badge.Root>
                  ) : (
                    'Select'
                  )
                }
                renderOptionLabel={(option) => (
                  <Badge.Root
                    size='small'
                    variant='light'
                    color={option.value === 'Active' ? 'green' : 'gray'}
                    className='text-nowrap'
                  >
                    {option.label}
                  </Badge.Root>
                )}
              />
            </div>

            <div className='flex w-full gap-2 items-center'>
              <Checkbox.Root
                id='allClients'
                checked={Boolean(allClients)}
                onCheckedChange={(checked) =>
                  setValue('allClients', Boolean(checked), { shouldValidate: true })
                }
              />
              <Label.Root
                htmlFor='allClients'
                className='text-[var(--color-text-main-900)] paragraph-small cursor-pointer select-none'
              >
                All Clients
              </Label.Root>
            </div>

            {!allClients && (
              <div className='flex w-full flex-col gap-2'>
                <Label.Root>
                  Clients
                  <Label.Asterisk />
                </Label.Root>
                {/* <MultiSelect
                  options={clientOptions}
                  value={selectedClients || []}
                  onValueChange={(value) => setValue('clients', value, { shouldValidate: true })}
                  placeholder='Select clients'
                  disabled={isLoading}
                  hasError={Boolean(errors.clients)}
                  enableVirtualization={false}
                  showCheckboxes
                /> */}

                <Select.Root className='px-0'>
                  <Select.Trigger>
                    <span className='truncate'>
                      {selectedClientsCount > 0
                        ? `${selectedClientsCount} client${
                            selectedClientsCount === 1 ? '' : 's'
                          } selected`
                        : 'Select clients'}
                    </span>
                  </Select.Trigger>
                  <Select.Content>
                    <div className='p-2 border-b border-stroke-soft-200'>
                      <Input.Root size='small' className='w-full'>
                        <Input.Wrapper>
                          <Input.Input
                            value={clientSearchText}
                            onChange={(e) => setClientSearchText(e.target.value)}
                            placeholder='Search centers or clients...'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </div>

                    {filteredCenterGroups.length === 0 ? (
                      <div className='p-3 text-paragraph-sm text-text-soft-400'>
                        No matching clients
                      </div>
                    ) : (
                      filteredCenterGroups.map((item, idx) => (
                        <div
                          key={item?.center ?? item?.center_name ?? idx}
                          className='flex flex-col gap-3 '
                        >
                          <div className='w-full flex flex-col gap-2 py-2'>
                            <span className='label-small flex items-center gap-2 p-2 rounded-md bg-bg-weak-100'>
                              <RiBuildingLine size={16} className='text-primary-base' />{' '}
                              {item?.center_name}
                            </span>
                            {item?.clients?.map((client, clientIdx) => {
                              const centerId = item?.center;
                              const clientId = client?.id;
                              const isSelected = selectedClients?.some(
                                (s) => s.center === centerId && s.client === clientId,
                              );
                              return (
                                <span
                                  key={client?.id ?? clientIdx}
                                  className='flex items-center gap-2 flex  pl-3 cursor-pointer paragraph-small'
                                >
                                  <Checkbox.Root
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const current = selectedClients || [];
                                      const entry = { center: centerId, client: clientId };
                                      const next = checked
                                        ? [...current, entry].filter((e) => e.center && e.client)
                                        : current.filter(
                                            (c) =>
                                              !(c.center === centerId && c.client === clientId),
                                          );
                                      setValue('clients', next, { shouldValidate: true });
                                    }}
                                    disabled={isLoading}
                                  />
                                  <span>{client?.name}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </Select.Content>
                </Select.Root>

                {errors.clients && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.clients.message}
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

export default AddBillingCategoryModal;
