import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiSettings3Line, RiErrorWarningFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { z } from 'zod';

const billingConfigSchema = z.object({
  center: z.string().min(1, 'Center is required'),
  client: z.string().min(1, 'Client is required'),
  categories: z.array(z.string()).min(1, 'At least one billing category is required'),
});

const BillingConfigModal = ({
  isOpen,
  isLoading,
  handleOpenChange,
  handleSave,
  centers = [],
  clients = [],
  categoryOptions = [],
  initialData = null,
}) => {
  const isEdit = Boolean(initialData);

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(billingConfigSchema),
    defaultValues: {
      center: '',
      client: '',
      categories: [],
    },
  });

  const selectedCenter = watch('center');
  const selectedClient = watch('client');
  const selectedCategories = watch('categories');

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      reset({
        center: initialData.center,
        client: initialData.client,
        categories: (initialData.categories || []).map((c) => c.name ?? c.category),
      });
    } else {
      reset({
        center: '',
        client: '',
        categories: [],
      });
    }
    // We intentionally only depend on isOpen so this runs once per open,
    // using the latest initialData at the time the modal is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const centerOptions = centers.map((c) => ({ value: c.name, label: c.center_name || c.name }));
  const clientOptions = clients.map((c) => ({ value: c.name, label: c.customer_name || c.name }));
  const billCategoryOptions = categoryOptions.map((c) => ({
    value: c.value ?? c.name ?? c.category,
    label: c.label ?? c.category ?? c.name,
  }));

  const onSubmit = (data) => {
    handleSave({
      center: data.center,
      client: data.client,
      categories: data.categories,
    });
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[480px]'>
        <Modal.Header
          icon={RiSettings3Line}
          title={isEdit ? 'Edit Billing Configuration' : 'Add Billing Configuration'}
          className='py-5 px-8'
          description={
            isEdit
              ? 'Update billing categories for this client-center combination.'
              : 'Configure billing categories for a client-center combination.'
          }
        />
        <Modal.Body className='px-8 py-6'>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className='w-full flex flex-col gap-4'
            id='billing-config-form'
          >
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Center
                <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                value={selectedCenter}
                onValueChange={(v) => setValue('center', v)}
                disabled={isLoading || isEdit}
                options={centerOptions}
                placeholder='Select center'
                showArrow={true}
              />
              {errors.center && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.center.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Client
                <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                value={selectedClient}
                onValueChange={(v) => setValue('client', v)}
                disabled={isLoading || isEdit}
                options={clientOptions}
                placeholder='Select client'
                showArrow={true}
              />
              {errors.client && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.client.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Bill Category
                <Label.Asterisk />
              </Label.Root>
              <MultiSelect
                options={billCategoryOptions}
                value={selectedCategories}
                onValueChange={(v) => setValue('categories', v)}
                placeholder='Select billing categories'
                disabled={isLoading}
                enableVirtualization={false}
              />
              {errors.categories && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.categories.message}
                </Hint.Root>
              )}
            </div>
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
                {isEdit ? 'Saving...' : 'Adding...'}
              </span>
            ) : isEdit ? (
              'Save'
            ) : (
              'Add'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default BillingConfigModal;
