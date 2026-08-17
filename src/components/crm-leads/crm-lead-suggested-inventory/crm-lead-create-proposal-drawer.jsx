import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths } from 'date-fns';
import {
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiFileList3Line,
  RiFileTextLine,
  RiGroupLine,
  RiListCheck2,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import * as SegmentedControl from '@/components/ui/segmented-control';
import * as Table from '@/components/ui/table';
import { Datepicker } from '@/components/ui/datepicker';
import {
  createCrmProposal,
  getCrmProposalTemplates,
  // prefetchClientBrandFromWebsite, // disabled with color theme
} from '@/api/crmProposals';
import { DEFAULT_PROPOSAL_TEMPLATE_KEY } from '@/components/ui/proposal-builder/deck/constants';
import { isValidWebsiteUrl, normalizeWebsiteUrl } from '@/utils/url-utils';
import { getCrmAccount } from '@/api/crmAccounts';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import * as Badge from '@/components/ui/badge';
import { getSpaceTypeBadge } from '@/components/space-management/constants';
import ErrorText from '@/components/ui/error-text';
// import { WEBSITE_REGEX } from '@/schemas/client-schema';

const proposalSchema = z
  .object({
    proposal_title: z.string().min(1, 'Proposal title is required'),
    description: z.string().optional(),
    proposal_date: z.date({ required_error: 'Proposal date is required' }),
    valid_till: z.date({ required_error: 'Valid till is required' }),
    proposal_template: z.string().min(1, 'Proposal template is required'),
    color_theme: z.enum(['DevX', 'Client(ai)']),
    website_url: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const website = String(data.website_url ?? '').trim();
    if (website && !isValidWebsiteUrl(normalizeWebsiteUrl(website))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid website URL',
        path: ['website_url'],
      });
    }
  });

const defaultValues = {
  proposal_title: '',
  description: '',
  proposal_date: new Date(),
  valid_till: addMonths(new Date(), 1),
  proposal_template: '',
  color_theme: 'DevX',
  website_url: '',
};

const REQUIRED_MARK_CLASS = 'text-text-soft-400';

function pickDefaultProposalTemplate(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return (
    list.find((row) => row.is_default)?.value ||
    list.find(
      (row) =>
        row.value === DEFAULT_PROPOSAL_TEMPLATE_KEY || row.label === DEFAULT_PROPOSAL_TEMPLATE_KEY,
    )?.value ||
    list[0]?.value ||
    ''
  );
}

const CrmLeadCreateProposalDrawer = ({
  open,
  onClose,
  lead,
  selectedRows,
  onRemoveInventoryRow,
  onCreated,
}) => {
  const [templates, setTemplates] = useState([]);
  const [accountLabel, setAccountLabel] = useState('');
  const [inventory, setInventory] = useState([]);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [brandFetchStatus, setBrandFetchStatus] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(proposalSchema),
    defaultValues,
  });
  const watchedDescription = watch('description');
  // const watchedColorTheme = watch('color_theme'); // disabled with color theme picker

  useEffect(() => {
    if (!open) return undefined;

    setInventory([...selectedRows]);
    setIsDescriptionOpen(false);

    let cancelled = false;
    getCrmProposalTemplates()
      .then((list) => {
        if (cancelled) return;
        const defaultTemplate = pickDefaultProposalTemplate(list);
        setTemplates(list);
        reset({
          ...defaultValues,
          proposal_date: new Date(),
          proposal_template: defaultTemplate,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setTemplates([]);
        reset(defaultValues);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedRows, reset]);

  useEffect(() => {
    const accountId = lead?.account;
    if (!accountId) {
      setAccountLabel(lead?.account_name || lead?.account_display_name || '—');
      return;
    }
    getCrmAccount(accountId)
      .then((doc) => setAccountLabel(doc?.account_name || doc?.name || accountId))
      .catch(() =>
        setAccountLabel(lead?.account_name || lead?.account_display_name || accountId || '—'),
      );
  }, [lead?.account, lead?.account_name, lead?.account_display_name]);

  const contactLabel =
    lead?.contact_display_name || lead?.contact_name || lead?.lead_name || lead?.contact || '—';

  const onSubmit = async (values) => {
    if (inventory.length === 0) {
      showErrorToast('Select at least one space');
      return;
    }
    try {
      const websiteInput = String(values.website_url ?? '').trim();
      const website_url = websiteInput ? normalizeWebsiteUrl(websiteInput) : '';
      /* Client(ai) brand scrape (disabled with color theme)
      const wantsClientBrand =
        values.color_theme === 'Client(ai)' && isValidWebsiteUrl(website_url);

      let brand = null;
      if (wantsClientBrand) {
        setBrandFetchStatus('Fetching brand colors and logo from website…');
        try {
          brand = await prefetchClientBrandFromWebsite(website_url);
          if (!brand?.theme_scraped) {
            showErrorToast(
              'Could not scrape brand from that website. Proposal will open with DevX theme.',
            );
          }
        } catch (brandError) {
          showErrorToast(brandError, {
            defaultMessage: 'Brand fetch failed. Proposal will open with DevX theme.',
          });
        } finally {
          setBrandFetchStatus('');
        }
      }
      */
      const result = await createCrmProposal({
        proposal_title: values.proposal_title,
        description: values.description,
        crm_lead: lead?.name,
        account: lead?.account,
        contact: lead?.contact,
        proposal_date: format(values.proposal_date, 'yyyy-MM-dd'),
        valid_till: format(values.valid_till, 'yyyy-MM-dd'),
        proposal_template: values.proposal_template,
        color_theme: 'DevX',
        ...(website_url ? { website_url } : {}),
        inventory,
      });

      if (result?.name && result?.deck_bootstrap_error) {
        showErrorToast(result.deck_bootstrap_error, {
          defaultMessage:
            'Proposal was created but the deck could not be built. Delete it and try again.',
        });
        onClose();
        return;
      }

      showSuccessToast(result?.message || 'Proposal created');
      onCreated?.(result);
      onClose();
    } catch (error) {
      setBrandFetchStatus('');
      showErrorToast(error, { defaultMessage: 'Failed to create proposal' });
    }
  };

  const handleRemove = (row) => {
    setInventory((prev) => prev.filter((r) => r.id !== row.id));
    onRemoveInventoryRow?.(row.id);
  };

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Drawer.Content className='relative flex h-full max-w-[560px] flex-col overflow-hidden'>
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiCheckboxCircleLine className='size-6 text-text-sub-500' />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-large text-text-main-900'>
                Create New Proposal
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Add below details to create a new proposal.
              </p>
            </div>
          </div>
        </Drawer.Header>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-1 flex-col overflow-hidden'>
          <Drawer.Body className='flex-1 overflow-y-auto px-6 pb-6 pt-4'>
            <div className='flex flex-col gap-6'>
              <div className='flex flex-col gap-4'>
                <div>
                  <Controller
                    name='proposal_title'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        {...field}
                        id='proposal_title'
                        hasError={isSubmitted && Boolean(errors.proposal_title)}
                        placeholder='Enter proposal title'
                        className='field-sizing-content text-lg'
                        simple
                      />
                    )}
                  />
                  {isSubmitted && errors.proposal_title && (
                    <ErrorText>{errors.proposal_title.message}</ErrorText>
                  )}
                </div>

                <div>
                  {isDescriptionOpen || String(watchedDescription ?? '').trim() !== '' ? (
                    <Controller
                      name='description'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          {...field}
                          id='description'
                          placeholder='Add description'
                          rows={4}
                          hasError={isSubmitted && Boolean(errors.description)}
                          className='min-h-[116px]'
                        />
                      )}
                    />
                  ) : (
                    <button
                      type='button'
                      onClick={() => setIsDescriptionOpen(true)}
                      className='flex w-full cursor-pointer items-center gap-1 rounded-10 border border-transparent px-2 py-1.5 hover:border-stroke-sub-300'
                    >
                      <RiStickyNoteLine className='size-5 text-text-soft-400' />
                      <span className='text-paragraph-md text-text-soft-400'>Add description</span>
                    </button>
                  )}
                  {isSubmitted && errors.description && (
                    <ErrorText className='w-full'>{errors.description.message}</ErrorText>
                  )}
                </div>
              </div>

              <section className='space-y-3'>
                <span className='flex items-center gap-2 label-medium text-text-sub-500'>
                  <RiGroupLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
                  Lead Details
                </span>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label.Root>Account Name</Label.Root>
                    <Input.Root className='mt-1 w-full' size='small'>
                      <Input.Wrapper>
                        <Input.Input value={accountLabel || '—'} readOnly />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                  <div>
                    <Label.Root>Contact Name</Label.Root>
                    <Input.Root className='mt-1 w-full'>
                      <Input.Wrapper size='small'>
                        <Input.Input value={contactLabel || '—'} readOnly />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </div>
              </section>

              <section className='space-y-3'>
                <span className='flex items-center gap-2 label-medium text-text-sub-500'>
                  <RiFileTextLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
                  Proposal Details
                </span>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label.Root>
                      Proposal Date <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='proposal_date'
                      control={control}
                      render={({ field }) => (
                        <Datepicker
                          value={field.value}
                          onChange={field.onChange}
                          className='mt-1 w-full'
                          variant='default'
                          size='small'
                        />
                      )}
                    />
                    {isSubmitted && errors.proposal_date && (
                      <ErrorText>{errors.proposal_date.message}</ErrorText>
                    )}
                  </div>
                  <div>
                    <Label.Root>
                      Valid Till <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='valid_till'
                      control={control}
                      render={({ field }) => (
                        <Datepicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='DD / MM / YYYY'
                          className='mt-1 w-full'
                          variant='default'
                          size='small'
                        />
                      )}
                    />
                    {isSubmitted && errors.valid_till && (
                      <ErrorText>{errors.valid_till.message}</ErrorText>
                    )}
                  </div>
                  <div>
                    <Label.Root>
                      Proposal Template <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='proposal_template'
                      control={control}
                      render={({ field }) => (
                        <Select.Root
                          key={`proposal-template-${templates.length}-${field.value || 'empty'}`}
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          hasError={isSubmitted && Boolean(errors.proposal_template)}
                          size='small'
                          disabled={templates.length === 0}
                        >
                          <Select.Trigger className='mt-1 w-full'>
                            <Select.Value
                              placeholder={templates.length === 0 ? 'Loading…' : 'Select'}
                            />
                          </Select.Trigger>
                          <Select.Content>
                            {templates.map((t) => (
                              <Select.Item key={t.value} value={t.value}>
                                {t.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                    {isSubmitted && errors.proposal_template && (
                      <ErrorText>{errors.proposal_template.message}</ErrorText>
                    )}
                  </div>
                  {/* Color theme (disabled — fixed proposal primary #4FAE7C)
                  <div>
                    <Label.Root>
                      Color Theme <span className={REQUIRED_MARK_CLASS}>*</span>
                    </Label.Root>
                    <Controller
                      name='color_theme'
                      control={control}
                      render={({ field }) => (
                        <SegmentedControl.Root
                          value={field.value}
                          onValueChange={field.onChange}
                          className='mt-1 w-full'
                        >
                          <SegmentedControl.List className='w-full'>
                            <SegmentedControl.Trigger value='DevX' className='flex-1'>
                              DevX
                            </SegmentedControl.Trigger>
                            <SegmentedControl.Trigger value='Client(ai)' className='flex-1'>
                              Client(ai)
                            </SegmentedControl.Trigger>
                          </SegmentedControl.List>
                        </SegmentedControl.Root>
                      )}
                    />
                  </div>
                  */}
                </div>
                {/* Client(ai) website (disabled with color theme)
                {watchedColorTheme === 'Client(ai)' ? (
                  <div>
                    <Label.Root>Website URL</Label.Root>
                    <Controller
                      name='website_url'
                      control={control}
                      render={({ field }) => (
                        <Input.Root className='mt-1 w-full' size='small'>
                          <Input.Wrapper size='small'>
                            <Input.Input {...field} placeholder='https://example.com (optional)' />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {isSubmitted && errors.website_url && (
                      <ErrorText>{errors.website_url.message}</ErrorText>
                    )}
                  </div>
                ) : null}
                */}
              </section>

              <section className='space-y-3'>
                <span className='flex items-center gap-2 label-medium text-text-sub-500'>
                  <RiListCheck2 className='size-5 shrink-0 text-text-soft-400' aria-hidden />
                  Selected Inventory
                </span>
                <div className='overflow-x-auto rounded-xl border border-stroke-soft-200'>
                  <Table.Root variant='compact' className='w-full min-w-[520px]'>
                    <Table.Header className='bg-bg-weak-100'>
                      <Table.Row className='h-9 border-none hover:bg-bg-weak-100'>
                        <Table.Head className='min-w-[180px] whitespace-nowrap px-3 py-2 text-label-xs text-text-soft-400'>
                          Center
                        </Table.Head>
                        <Table.Head className='min-w-[130px] whitespace-nowrap px-3 py-2 text-label-xs text-text-soft-400'>
                          Space Type
                        </Table.Head>
                        <Table.Head className='min-w-[140px] whitespace-nowrap px-3 py-2 text-label-xs text-text-soft-400'>
                          Space Name
                        </Table.Head>
                        <Table.Head className='w-10 px-2 py-2 text-label-xs text-text-soft-400' />
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {inventory.map((row, rowIndex) => {
                        const typeBadge = getSpaceTypeBadge(row.space_type);
                        return (
                          <React.Fragment key={row.id}>
                            <Table.Row className='h-10 border-none transition-colors hover:bg-bg-weak-50'>
                              <Table.Cell className='whitespace-nowrap px-3 py-2'>
                                <span className='text-label-sm font-medium text-text-strong-950 capitalize'>
                                  {row.center_name}
                                </span>
                                {row.city_code ? (
                                  <span className='ml-1 text-[11px] font-medium uppercase tracking-[0.22px] text-text-soft-400'>
                                    ({row.city_code})
                                  </span>
                                ) : null}
                              </Table.Cell>
                              <Table.Cell className='whitespace-nowrap px-3 py-2'>
                                {typeBadge?.label && typeBadge.label !== '--' ? (
                                  <Badge.Root
                                    size='small'
                                    variant='light'
                                    color={typeBadge.color}
                                    className='whitespace-nowrap'
                                  >
                                    {typeBadge.label}
                                  </Badge.Root>
                                ) : null}
                              </Table.Cell>
                              <Table.Cell className='whitespace-nowrap px-3 py-2 text-text-sub-600 text-label-sm'>
                                {row.space_name}
                              </Table.Cell>
                              <Table.Cell className='px-2 py-2'>
                                <button
                                  type='button'
                                  onClick={() => handleRemove(row)}
                                  className='text-text-soft-400 transition-colors hover:text-[#DF1C41]'
                                  aria-label='Remove inventory'
                                >
                                  <RiDeleteBinLine className='size-4' />
                                </button>
                              </Table.Cell>
                            </Table.Row>
                            {rowIndex < inventory.length - 1 ? <Table.RowDivider /> : null}
                          </React.Fragment>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </div>
              </section>
            </div>
          </Drawer.Body>
          <Drawer.Footer className='border-t border-stroke-soft-200 px-6 py-4'>
            <div className='flex items-center justify-end gap-2'>
              <Button.Root type='button' variant='neutral' mode='stroke' onClick={onClose}>
                Cancel
              </Button.Root>
              <Button.Root
                type='submit'
                variant='primary'
                disabled={isSubmitting || Boolean(brandFetchStatus)}
              >
                {brandFetchStatus || (isSubmitting ? 'Creating…' : 'Create')}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CrmLeadCreateProposalDrawer;
