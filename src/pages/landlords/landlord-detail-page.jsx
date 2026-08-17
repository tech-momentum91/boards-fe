import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowLeftSLine,
  RiAddLine,
  RiInformationLine,
  RiInformationFill,
  RiFileTextLine,
  RiFileTextFill,
  RiMoneyRupeeCircleLine,
  RiMoneyRupeeCircleFill,
  RiTimeLine,
  RiTimeFill,
  RiUser2Line,
  RiMapPin2Line,
  RiPriceTag3Line,
  RiLayoutGridLine,
  RiFileListLine,
  RiFileListFill,
  RiMoneyDollarCircleFill,
  RiMoneyDollarCircleLine,
  RiHistoryFill,
  RiHistoryLine,
  RiContactsBook2Line,
  RiBankLine,
  RiLayout4Line,
  RiPencilLine,
  RiDeleteBinLine,
  RiAlertFill,
  RiCloseFill,
  RiCloseLine,
  RiCheckLine,
} from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import * as Switch from '@/components/ui/switch';
import * as Avatar from '@/components/ui/avatar';
import * as LinkButton from '@/components/ui/link-button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Checkbox from '@/components/ui/checkbox';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import LandlordDetailAboutSidebar from '@/components/landlords-management/landlord-detail/landlord-detail-about-sidebar';
import ContactCards from '@/components/ui/contact-cards';
import {
  getLandlordDetailThunk,
  resetLandlordDetail,
  selectLandlordDetail,
  deleteLandlordContactThunk,
  deleteLandlordBankDetailsThunk,
  updateLandlordBankDetailsThunk,
  updateLandlordAddressThunk,
  updateLandlordFieldThunk,
  updateLandlordTagsThunk,
  selectLandlordLocalChanges,
  setLandlordLocalChange,
  clearLandlordLocalChanges,
  getLandlordFieldValue,
} from '@/redux/landlordSlice';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';
import { validateClientField } from '@/schemas/client-schema';
import { ComingSoonMessage } from '@/components';
import { AddBankModal } from '@/components/clients-management/client-add-bank-modal';
import AddLandlordContactModal from '@/components/landlords-management/add-landlord-contact-modal';
import {
  ENGAGEMENT_MODE_OPTIONS,
  LANDLORD_DETAIL_TAB_READ_MODULE,
} from '@/components/landlords-management/constants';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
} from '@/hooks/use-detail-tab-permissions';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import { getStatusOptions } from '@/api/dynamic-status';

const getGstStatusVariant = (gstStatus) => {
  if (!gstStatus) return 'disabled';
  const map = { Registered: 'green', Composition: 'gray', Unregistered: 'red' };
  return map[gstStatus] || 'disabled';
};

const LANDLORD_MAIN_TAB_ORDER = ['about', 'agreements', 'billing', 'activities'];

// Dummy contacts for display when API returns none
const DUMMY_CONTACTS = [
  {
    contact_name: 'Rajesh Kumar',
    department: 'ADMINISTRATION',
    is_primary_contact: 1,
    mobile_no: ' 98765 43210',
    email: 'rajesh.kumar@techcorp.com',
  },
  {
    contact_name: 'Kristin Watson',
    department: 'ADMINISTRATION',
    is_primary_contact: 0,
    mobile_no: '98765 43210',
    email: 'kristin.watson@techcorp.com',
  },
];

// Dummy bank details for display when API returns none
const DUMMY_BANK_DETAILS = [
  {
    bank_name: 'HDFC Bank',
    bank_account_number: '50200012345678',
    ifsc_code: 'HDFC0001234',
    is_primary: true,
  },
  {
    bank_name: 'ICICI Bank',
    bank_account_number: '60300198765432',
    ifsc_code: 'ICIC0005678',
    is_primary: false,
  },
];

const LandlordDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const landlordDetail = useSelector(selectLandlordDetail);
  const landlord = landlordDetail?.data;
  const final_tags = landlord?._user_tags?.split(',').filter((tag) => tag.length > 0) || [];
  const localChanges = useSelector(selectLandlordLocalChanges);
  const centerAccess = useSelector(selectCenterAccess);
  const centers = centerAccess?.data || [];
  const [activeTab, setActiveTab] = useState('about');
  const [aboutSidebar, setAboutSidebar] = useState('basic');

  const canReadLandlordTab = useCanReadDetailTab(LANDLORD_DETAIL_TAB_READ_MODULE);
  const permittedMainTabIds = useMemo(
    () => LANDLORD_MAIN_TAB_ORDER.filter((id) => canReadLandlordTab(id)),
    [canReadLandlordTab],
  );
  useClampActiveTabToPermitted(activeTab, setActiveTab, permittedMainTabIds);
  const [addBankModalOpen, setAddBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankToDelete, setBankToDelete] = useState(null);
  const [settingPrimaryBankId, setSettingPrimaryBankId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [hoveredTag, setHoveredTag] = useState(null);
  const [addressForm, setAddressForm] = useState({
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [billingSameAsPrimary, setBillingSameAsPrimary] = useState(false);
  const [addLandlordContactModalOpen, setAddLandlordContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [tagsUpdating, setTagsUpdating] = useState(false);
  const [statutoryFieldErrors, setStatutoryFieldErrors] = useState({});
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);
  const [isLoadingDynamicStatuses, setIsLoadingDynamicStatuses] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(getLandlordDetailThunk(id));
      dispatch(fetchCenterAccess({ silent: true }));
    }
    return () => {
      dispatch(resetLandlordDetail());
    };
  }, [dispatch, id]);

  // Dynamic Status options for Landlord.status
  useEffect(() => {
    let isMounted = true;
    const fetchStatuses = async () => {
      setIsLoadingDynamicStatuses(true);
      try {
        const normalized = await getStatusOptions({ doctype: 'Landlord', field: 'status' });
        if (isMounted) setDynamicStatusOptions(normalized);
      } catch {
        // Keep empty (API-only statuses)
        if (isMounted) setDynamicStatusOptions([]);
      } finally {
        if (isMounted) setIsLoadingDynamicStatuses(false);
      }
    };
    fetchStatuses();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    dispatch(clearLandlordLocalChanges());
  }, [id, dispatch]);

  const addressList = landlord?.address || [];
  const primaryAddressFromList = addressList.find((a) => a?.is_primary) || addressList[0];
  const billingAddressFromList = addressList.find((a) => a?.is_billing);

  useEffect(() => {
    if (editingAddress) {
      setAddressForm({
        address_line_1: editingAddress.address_line_1 || editingAddress.address_line1 || '',
        address_line_2: editingAddress.address_line_2 || editingAddress.address_line2 || '',
        city: editingAddress.city || '',
        state: editingAddress.state || '',
        pincode: editingAddress.pincode || '',
      });
      setBillingSameAsPrimary(false);
    }
  }, [editingAddress]);

  const handleBack = () => navigate('/landlords');

  const title =
    getLandlordFieldValue(landlord, localChanges, 'landlord_name') ||
    landlord?.landlord_name ||
    landlord?.name ||
    'Landlord Details';
  const status = getLandlordFieldValue(landlord, localChanges, 'status') || 'Active';
  const headerStatusColor =
    dynamicStatusOptions.find((o) => String(o.value) === String(status || '').trim())?.color ??
    landlord?.status_color ??
    landlord?.statusColor ??
    null;

  const contacts = landlord?.contact || [];
  const getServerValue = (fieldname) => {
    if (!landlord) return '';
    if (fieldname === 'legal_name') return landlord.legal_name ?? '';
    if (fieldname === 'landlord_name') return landlord.landlord_name ?? '';
    if (fieldname === 'engagement_mode') return landlord.engagement_mode ?? '';
    if (fieldname === 'center') return landlord?.center_details?.[0]?.center ?? '';
    if (fieldname === 'shop_number') return landlord?.center_details?.[0]?.shop_number ?? '';
    if (fieldname === 'block_floor') return landlord?.center_details?.[0]?.block_floor ?? '';
    const v = landlord[fieldname];
    return v !== undefined && v !== null ? String(v) : '';
  };

  const handleFieldChange = async (fieldname, value) => {
    if (!id) return;
    const landlordId = landlord?.name || landlord?.id || id;
    const serverValue = getServerValue(fieldname);
    if (String(serverValue) === String(value ?? '')) return;

    dispatch(setLandlordLocalChange({ fieldName: fieldname, value }));

    const isCenterField = ['center', 'block_floor', 'shop_number'].includes(fieldname);

    const result = await dispatch(
      updateLandlordFieldThunk(
        isCenterField
          ? {
              landlordId,
              fieldname: 'center_details',
              value: [
                {
                  name: landlord?.center_details?.[0]?.name || '',
                  center: landlord?.center_details?.[0]?.center || '',
                  block_floor: landlord?.center_details?.[0]?.block_floor || '',
                  shop_number: landlord?.center_details?.[0]?.shop_number || '',
                  [fieldname]: value,
                },
              ],
            }
          : { landlordId, fieldname, value },
      ),
    );

    if (updateLandlordFieldThunk.rejected.match(result)) {
      dispatch(setLandlordLocalChange({ fieldName: fieldname, value: null }));
      showErrorToast(result.payload, {
        defaultMessage: 'Failed to update landlord field. Please try again.',
      });
      return;
    }

    await dispatch(getLandlordDetailThunk(id));
    dispatch(setLandlordLocalChange({ fieldName: fieldname, value: null }));
  };
  const addresses = landlord?.custom_addresses || [];
  const primaryAddress = addresses.find((a) => a?.is_primary) || addresses[0];
  const billingAddress = addresses.find((a) => a?.is_billing);

  const formatAddress = (addr) => {
    if (!addr) return '--';
    const parts = [
      addr.address_line_1 || addr.address_line1,
      addr.address_line_2 || addr.address_line2,
      addr.city,
      addr.state,
      addr.pincode,
    ].filter(Boolean);
    return parts.join(', ') || '--';
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setAddLandlordContactModalOpen(true);
  };

  const handleEditContact = (originalContact) => {
    setEditingContact(originalContact);
    setAddLandlordContactModalOpen(true);
  };

  const handleDeleteContact = async (contact) => {
    const contactRow = contact?.originalContact?.name;
    if (!contactRow || !id) {
      showErrorToast('Unable to delete contact');
      return;
    }
    try {
      const result = await dispatch(
        deleteLandlordContactThunk({ contact: contactRow, landlord: id }),
      );
      if (deleteLandlordContactThunk.rejected.match(result)) {
        showErrorToast(result.payload, {
          defaultMessage: 'Failed to delete contact. Please try again.',
        });
        throw new Error('Delete failed');
      }
      showSuccessToast('Contact deleted successfully.');
      if (id) await dispatch(getLandlordDetailThunk(id));
    } catch (error) {
      if (error?.message !== 'Delete failed') {
        showErrorToast(error, {
          defaultMessage: 'Failed to delete contact. Please try again.',
        });
      }
      throw error;
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    if (!id) return;
    const newTags = final_tags.filter((t) => t !== tagToRemove);
    setTagsUpdating(true);
    try {
      const result = await dispatch(updateLandlordTagsThunk({ landlord: id, tags: newTags }));
      if (updateLandlordTagsThunk.rejected.match(result)) {
        showErrorToast(result.payload, {
          defaultMessage: 'Failed to update tags. Please try again.',
        });
        return;
      }
      await dispatch(getLandlordDetailThunk(id));
    } finally {
      setTagsUpdating(false);
    }
  };

  const handleAddTag = async () => {
    const trimmed = newTagValue.trim();
    if (!trimmed || !id) return;
    const newTags = [...final_tags, trimmed];
    setTagsUpdating(true);
    try {
      const result = await dispatch(updateLandlordTagsThunk({ landlord: id, tags: newTags }));
      if (updateLandlordTagsThunk.rejected.match(result)) {
        showErrorToast(result.payload, {
          defaultMessage: 'Failed to add tag. Please try again.',
        });
        return;
      }
      setNewTagValue('');
      setTagInputVisible(false);
      await dispatch(getLandlordDetailThunk(id));
    } finally {
      setTagsUpdating(false);
    }
  };

  return (
    <PageLayout showDefaultHeader={false} contentAreaClassName='!overflow-hidden'>
      <div className='flex h-full min-h-0 w-full flex-col'>
        {/* Header */}
        <div className='shrink-0 pt-5 pb-[14px] pl-8 pr-8 border-b w-full border-stroke-soft-200 bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex min-w-0 items-center gap-4'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back'
                onClick={handleBack}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>
              <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                <EditableFieldWrapper editable={true} iconClassName='mr-2' className='w-full'>
                  <Input.Root
                    variant='borderless'
                    size='xsmall'
                    className='-ml-2 w-full text-label-md text-text-strong-950'
                  >
                    <Input.Wrapper>
                      <Input.Input
                        value={getLandlordFieldValue(landlord, localChanges, 'landlord_name') || ''}
                        onChange={(e) =>
                          dispatch(
                            setLandlordLocalChange({
                              fieldName: 'landlord_name',
                              value: e.target.value,
                            }),
                          )
                        }
                        onBlur={(e) =>
                          handleFieldChange('landlord_name', e.target.value.trim() || '')
                        }
                        placeholder='Landlord name'
                        className='w-full text-label-md text-text-strong-950 bg-transparent'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </EditableFieldWrapper>
                <div className='flex items-center gap-2 min-w-0'>
                  <StatusColorPill
                    value={status}
                    color={headerStatusColor}
                    className='max-w-full'
                  />
                </div>
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-3'>
              <Button.Root variant='neutral' mode='stroke' size='small' className='gap-1'>
                <Button.Icon as={RiAddLine} />
                Add Agreement
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='View agreements'
              >
                <Button.Icon as={RiLayout4Line} size={20} />
              </Button.Root>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='flex min-h-0 flex-1 w-full flex-col overflow-hidden border-stroke-soft-200'>
          <TabMenuHorizontal.Root
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex h-full min-h-0 flex-col overflow-hidden'
          >
            <TabMenuHorizontal.List
              wrapperClassName='w-full shrink-0'
              className='w-[calc(100%-64px)] mx-8'
            >
              {permittedMainTabIds.includes('about') ? (
                <TabMenuHorizontal.Trigger value='about'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'about' ? RiInformationFill : RiInformationLine}
                  />
                  About Landlord
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedMainTabIds.includes('agreements') ? (
                <TabMenuHorizontal.Trigger value='agreements'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'agreements' ? RiFileListFill : RiFileListLine}
                  />
                  Agreements
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedMainTabIds.includes('billing') ? (
                <TabMenuHorizontal.Trigger value='billing'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'billing' ? RiMoneyDollarCircleFill : RiMoneyDollarCircleLine}
                  />
                  Billing
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedMainTabIds.includes('activities') ? (
                <TabMenuHorizontal.Trigger value='activities'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'activities' ? RiHistoryFill : RiHistoryLine}
                  />
                  Activities
                </TabMenuHorizontal.Trigger>
              ) : null}
            </TabMenuHorizontal.List>

            {/* About Landlord Tab */}
            <TabMenuHorizontal.Content value='about' className='min-h-0 flex-1 overflow-hidden'>
              <div className='flex h-full min-h-0 min-w-0 overflow-hidden'>
                <LandlordDetailAboutSidebar value={aboutSidebar} onValueChange={setAboutSidebar} />
                <div className='min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-8 py-6'>
                  {landlordDetail.isLoading && !landlord ? (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                      Loading landlord details...
                    </div>
                  ) : landlord ? (
                    aboutSidebar === 'basic' ? (
                      <div className='flex flex-col gap-6'>
                        {/* Basic info grid */}
                        <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                              Status
                            </div>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <SearchableSelect
                                variant='borderless'
                                value={getLandlordFieldValue(landlord, localChanges, 'status')}
                                onValueChange={(value) => handleFieldChange('status', value)}
                                size='xsmall'
                                options={dynamicStatusOptions}
                                placeholder='Select'
                                searchPlaceholder='Search status...'
                                triggerClassName='w-full -ml-2 text-left'
                                showArrow={false}
                                disabled={isLoadingDynamicStatuses}
                                renderTrigger={() => {
                                  const currentValue = (
                                    getLandlordFieldValue(landlord, localChanges, 'status') || ''
                                  ).trim();
                                  const selected = dynamicStatusOptions.find(
                                    (o) => o.value === currentValue,
                                  );
                                  if (!selected) {
                                    return (
                                      <span className='text-label-sm text-text-sub-400'>
                                        Select
                                      </span>
                                    );
                                  }
                                  return (
                                    <StatusColorPill
                                      value={selected.label}
                                      color={selected.color}
                                      className='max-w-full text-nowrap'
                                    />
                                  );
                                }}
                                renderOptionLabel={(option) => (
                                  <StatusColorPill
                                    value={option.label}
                                    color={option.color}
                                    className='max-w-full'
                                  />
                                )}
                              />
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                              Landlord Legal Name
                            </div>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <Input.Root
                                key={`legal-name-${landlord?.name || id || 'default'}`}
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(landlord, localChanges, 'legal_name') ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'legal_name',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) =>
                                      handleFieldChange('legal_name', e.target.value.trim() || '')
                                    }
                                    placeholder='Enter legal name'
                                    className='text-paragraph-sm text-text-strong-950'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                              Center
                            </div>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <SearchableSelect
                                variant='borderless'
                                value={
                                  localChanges?.center !== undefined &&
                                  localChanges?.center !== null
                                    ? localChanges.center
                                    : landlord?.center_details?.[0]?.center || ''
                                }
                                onValueChange={(value) => handleFieldChange('center', value)}
                                size='xsmall'
                                options={centers.map((c) => ({
                                  value: c.name,
                                  label: c.center_name,
                                }))}
                                placeholder='Choose Center'
                                searchPlaceholder='Search center...'
                                triggerClassName='w-full -ml-2 text-left'
                                showArrow={false}
                                renderTrigger={({ placeholder }) => {
                                  const currentCenterName =
                                    localChanges?.center !== undefined &&
                                    localChanges?.center !== null
                                      ? localChanges.center
                                      : landlord?.center_details?.[0]?.center || '';
                                  const displayLabel =
                                    localChanges?.center !== undefined &&
                                    localChanges?.center !== null
                                      ? centers.find((c) => c.name === currentCenterName)
                                          ?.center_name || currentCenterName
                                      : landlord?.center_details?.[0]?.center_name ||
                                        placeholder ||
                                        '--';
                                  return (
                                    <span className='text-paragraph-sm text-text-strong-950 block truncate'>
                                      {displayLabel}
                                    </span>
                                  );
                                }}
                              />
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                              Block/Floor
                            </div>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      localChanges?.block_floor !== undefined &&
                                      localChanges?.block_floor !== null
                                        ? localChanges.block_floor
                                        : landlord?.center_details?.[0]?.block_floor || ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'block_floor',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) =>
                                      handleFieldChange('block_floor', e.target.value.trim() || '')
                                    }
                                    placeholder='Enter Block/Floor'
                                    className='text-paragraph-sm text-text-strong-950'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                              Engagement Mode
                            </div>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <SearchableSelect
                                variant='borderless'
                                value={getLandlordFieldValue(
                                  landlord,
                                  localChanges,
                                  'engagement_mode',
                                )}
                                onValueChange={(value) =>
                                  handleFieldChange('engagement_mode', value)
                                }
                                size='xsmall'
                                options={ENGAGEMENT_MODE_OPTIONS}
                                placeholder='Select'
                                searchPlaceholder='Search engagement mode...'
                                triggerClassName='w-full -ml-2 text-left'
                                showArrow={false}
                                renderTrigger={() => (
                                  <Badge.Root size='small' variant='stroke' color='gray'>
                                    {getLandlordFieldValue(
                                      landlord,
                                      localChanges,
                                      'engagement_mode',
                                    ) || '--'}
                                  </Badge.Root>
                                )}
                              />
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                              Shop No.
                            </div>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      localChanges?.shop_number !== undefined &&
                                      localChanges?.shop_number !== null
                                        ? localChanges.shop_number
                                        : landlord?.center_details?.[0]?.shop_number || ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'shop_number',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) =>
                                      handleFieldChange('shop_number', e.target.value.trim() || '')
                                    }
                                    placeholder='Enter shop number'
                                    className='text-paragraph-sm text-text-strong-950'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                        </div>

                        {/* Contacts */}
                        <ContactCards
                          contacts={contacts}
                          onAddContact={handleAddContact}
                          onEditContact={handleEditContact}
                          onDeleteContact={handleDeleteContact}
                          emptyState={{
                            title: 'No contacts added yet.',
                            description: 'Add a contact to get started.',
                          }}
                          showActions={true}
                        />

                        {/* Address */}
                        <div className='flex flex-col gap-3 border-t border-stroke-soft-200 pt-4'>
                          <div className='flex items-center gap-2'>
                            <RiMapPin2Line size={20} className='text-text-soft-400' />
                            <span className='text-label-md text-text-sub-500'>Address</span>
                          </div>
                          <div className='grid grid-cols-2 gap-3'>
                            {(landlord?.address || []).map((addr, index) => (
                              <div
                                key={addr.name ?? index}
                                className='rounded-xl border border-stroke-soft-200 p-3 flex flex-col gap-1.5 group relative'
                              >
                                <div className='flex items-center justify-between gap-2'>
                                  <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
                                    {addr.is_primary
                                      ? 'PRIMARY ADDRESS'
                                      : addr.is_billing
                                        ? 'BILLING ADDRESS'
                                        : 'ADDRESS'}
                                  </div>
                                  <Button.Root
                                    variant='neutral'
                                    mode='ghost'
                                    size='xsmall'
                                    className='opacity-0 group-hover:opacity-100 transition-opacity shrink-0'
                                    onClick={() => setEditingAddress(addr)}
                                  >
                                    <Button.Icon as={RiPencilLine} size={16} />
                                  </Button.Root>
                                </div>
                                <div className='text-paragraph-sm text-text-sub-600'>
                                  {formatAddress(addr)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className='flex flex-col gap-3 items-start border-t border-stroke-soft-200 pt-4'>
                          <div className='flex items-center gap-2'>
                            <RiPriceTag3Line size={20} className='text-text-soft-400' />
                            <span className='text-label-md text-text-sub-500'>Tags</span>
                          </div>
                          <div className='flex flex-wrap gap-2 items-center'>
                            {final_tags?.map((tag) => (
                              <Badge.Root
                                onMouseEnter={() => setHoveredTag(tag)}
                                onMouseLeave={() => setHoveredTag(null)}
                                key={tag}
                                size='medium'
                                variant='stroke'
                                className='gap-1'
                              >
                                {tag}
                                {/* <button
                                  type='button'
                                  onClick={() => handleRemoveTag(tag)}
                                  disabled={tagsUpdating}
                                  className='inline-flex p-0.5 rounded hover:bg-[var(--color-bg-weak-200)] text-[var(--color-text-soft-400)] hover:text-text-sub-600 disabled:opacity-50'
                                  aria-label={`Remove ${tag}`}
                                > */}
                                {hoveredTag === tag && (
                                  <RiCloseFill
                                    className='text-[var(--color-text-soft-400)] hover:cursor-pointer'
                                    onClick={() => handleRemoveTag(tag)}
                                    size={16}
                                  />
                                )}
                                {/* </button> */}
                              </Badge.Root>
                            ))}
                          </div>

                          {tagInputVisible ? (
                            <div className='flex items-center gap-2 w-full max-w-sm'>
                              <Input.Root className='flex-1' size='xsmall'>
                                <Input.Wrapper>
                                  <Input.Input
                                    placeholder='Enter tag'
                                    value={newTagValue}
                                    onChange={(e) => setNewTagValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                      }
                                    }}
                                    autoFocus
                                    disabled={tagsUpdating}
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                              <Button.Root
                                variant='neutral'
                                mode='ghost'
                                size='xsmall'
                                className='shrink-0 text-error-base hover:text-error-dark'
                                onClick={() => {
                                  setTagInputVisible(false);
                                  setNewTagValue('');
                                }}
                                disabled={tagsUpdating}
                              >
                                <Button.Icon as={RiCloseLine} />
                              </Button.Root>
                              <Button.Root
                                variant='neutral'
                                mode='ghost'
                                size='xsmall'
                                className='shrink-0 bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]'
                                onClick={handleAddTag}
                                disabled={tagsUpdating || !newTagValue.trim()}
                              >
                                <Button.Icon as={RiCheckLine} />
                              </Button.Root>
                            </div>
                          ) : (
                            <LinkButton.Root
                              variant='primary'
                              size='small'
                              onClick={() => setTagInputVisible(true)}
                              disabled={tagsUpdating}
                            >
                              <LinkButton.Icon as={RiAddLine} />
                              Add New Tag
                            </LinkButton.Root>
                          )}
                        </div>
                      </div>
                    ) : aboutSidebar === 'statutory' ? (
                      <div className='flex flex-col gap-5'>
                        <div className='flex items-center gap-2'>
                          <RiContactsBook2Line className='size-5 text-text-sub-500 shrink-0' />
                          <h3 className='text-label-md text-neutral-500'>
                            Statutory & Compliance Details
                          </h3>
                        </div>
                        <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-[var(--color-text-sub-500)]'>
                              Registration Number
                            </div>
                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full text-label-md text-text-strong-950'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(
                                        landlord,
                                        localChanges,
                                        'registration_number',
                                      ) || ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'registration_number',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) =>
                                      handleFieldChange(
                                        'registration_number',
                                        e.target.value.trim() || '',
                                      )
                                    }
                                    placeholder='Registration Number'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-text-sub-500'>PAN Number</div>
                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full'
                                hasError={Boolean(statutoryFieldErrors.pan_number)}
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(landlord, localChanges, 'pan_number') ||
                                      ''
                                    }
                                    onChange={(e) => {
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'pan_number',
                                          value: e.target.value,
                                        }),
                                      );
                                      if (statutoryFieldErrors.pan_number) {
                                        setStatutoryFieldErrors((previous) => ({
                                          ...previous,
                                          pan_number: '',
                                        }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value.trim().toUpperCase();
                                      const error = validateClientField('pan', value);
                                      if (error) {
                                        setStatutoryFieldErrors((previous) => ({
                                          ...previous,
                                          pan_number: error,
                                        }));
                                        return;
                                      }
                                      setStatutoryFieldErrors((previous) => ({
                                        ...previous,
                                        pan_number: '',
                                      }));
                                      if (value !== (landlord?.pan_number || '')) {
                                        handleFieldChange('pan_number', value);
                                      }
                                    }}
                                    placeholder='PAN Number'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                            {statutoryFieldErrors.pan_number && (
                              <span className='text-paragraph-xs text-error-base'>
                                {statutoryFieldErrors.pan_number}
                              </span>
                            )}
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-text-sub-500'>TAN Number</div>
                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full text-label-md text-text-strong-950'
                                hasError={Boolean(statutoryFieldErrors.tan_number)}
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(landlord, localChanges, 'tan_number') ||
                                      ''
                                    }
                                    onChange={(e) => {
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'tan_number',
                                          value: e.target.value,
                                        }),
                                      );
                                      if (statutoryFieldErrors.tan_number) {
                                        setStatutoryFieldErrors((previous) => ({
                                          ...previous,
                                          tan_number: '',
                                        }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value.trim().toUpperCase();
                                      const error = validateClientField('custom_tan_number', value);
                                      if (error) {
                                        setStatutoryFieldErrors((previous) => ({
                                          ...previous,
                                          tan_number: error,
                                        }));
                                        return;
                                      }
                                      setStatutoryFieldErrors((previous) => ({
                                        ...previous,
                                        tan_number: '',
                                      }));
                                      if (value !== (landlord?.tan_number || '')) {
                                        handleFieldChange('tan_number', value);
                                      }
                                    }}
                                    placeholder='TAN Number'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                            {statutoryFieldErrors.tan_number && (
                              <span className='text-paragraph-xs text-error-base'>
                                {statutoryFieldErrors.tan_number}
                              </span>
                            )}
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-text-sub-500'>GST Status</div>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <SearchableSelect
                                variant='borderless'
                                value={getLandlordFieldValue(landlord, localChanges, 'gst_status')}
                                onValueChange={(value) => {
                                  const gstinValue =
                                    getLandlordFieldValue(landlord, localChanges, 'gstin') || '';
                                  const gstinTrimmed = String(gstinValue).trim().toUpperCase();

                                  dispatch(
                                    setLandlordLocalChange({ fieldName: 'gst_status', value }),
                                  );

                                  if (value === 'Unregistered') {
                                    setStatutoryFieldErrors((previous) => ({
                                      ...previous,
                                      gstin: '',
                                    }));
                                    handleFieldChange('gst_status', 'Unregistered');
                                    handleFieldChange('gstin', '');
                                    return;
                                  }

                                  if (value === 'Registered' || value === 'Composition') {
                                    const gstinError = validateClientField('gstin', gstinTrimmed, {
                                      gstStatus: value,
                                      custom_gst_status: value,
                                    });
                                    if (gstinError) {
                                      setStatutoryFieldErrors((previous) => ({
                                        ...previous,
                                        gstin: gstinError,
                                      }));
                                      return;
                                    }
                                    setStatutoryFieldErrors((previous) => ({
                                      ...previous,
                                      gstin: '',
                                    }));
                                    handleFieldChange('gst_status', value);
                                    handleFieldChange('gstin', gstinTrimmed || '');
                                  } else {
                                    handleFieldChange('gst_status', value);
                                  }
                                }}
                                size='xsmall'
                                options={[
                                  { value: 'Registered', label: 'Registered' },
                                  { value: 'Composition', label: 'Composition' },
                                  { value: 'Unregistered', label: 'Unregistered' },
                                ]}
                                placeholder='Select'
                                searchPlaceholder='Search GST status...'
                                triggerClassName='w-full -ml-2 text-left'
                                showArrow={false}
                                renderTrigger={() => (
                                  <Badge.Root
                                    size='small'
                                    variant='light'
                                    color={getGstStatusVariant(
                                      getLandlordFieldValue(landlord, localChanges, 'gst_status'),
                                    )}
                                    className='text-nowrap'
                                  >
                                    {getLandlordFieldValue(landlord, localChanges, 'gst_status') ||
                                      '--'}
                                  </Badge.Root>
                                )}
                              />
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-text-sub-500'>
                              GSTIN
                              {(getLandlordFieldValue(landlord, localChanges, 'gst_status') ===
                                'Registered' ||
                                getLandlordFieldValue(landlord, localChanges, 'gst_status') ===
                                  'Composition') && <Label.Asterisk />}
                            </div>
                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full text-label-md text-text-strong-950'
                                hasError={Boolean(statutoryFieldErrors.gstin)}
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(landlord, localChanges, 'gstin') || ''
                                    }
                                    onChange={(e) => {
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'gstin',
                                          value: e.target.value.toUpperCase(),
                                        }),
                                      );
                                      if (statutoryFieldErrors.gstin) {
                                        setStatutoryFieldErrors((previous) => ({
                                          ...previous,
                                          gstin: '',
                                        }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value.trim().toUpperCase();
                                      const gstStatus = getLandlordFieldValue(
                                        landlord,
                                        localChanges,
                                        'gst_status',
                                      );
                                      const error = validateClientField('gstin', value, {
                                        gstStatus,
                                        custom_gst_status: gstStatus,
                                      });
                                      if (error) {
                                        setStatutoryFieldErrors((previous) => ({
                                          ...previous,
                                          gstin: error,
                                        }));
                                        dispatch(
                                          setLandlordLocalChange({
                                            fieldName: 'gstin',
                                            value: null,
                                          }),
                                        );
                                        return;
                                      }
                                      setStatutoryFieldErrors((previous) => ({
                                        ...previous,
                                        gstin: '',
                                      }));
                                      if (value !== (landlord?.gstin || '')) {
                                        handleFieldChange('gstin', value);
                                      }
                                    }}
                                    placeholder='GSTIN'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                            {statutoryFieldErrors.gstin && (
                              <span className='text-paragraph-xs text-error-base'>
                                {statutoryFieldErrors.gstin}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className='border-t border-stroke-soft-200' />
                        <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
                          <div className='flex flex-col gap-1'>
                            <div className='text-paragraph-sm text-text-sub-500'>
                              MSME Registered
                            </div>
                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full text-label-md text-text-strong-950'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(
                                        landlord,
                                        localChanges,
                                        'msme_registered',
                                      ) || ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'msme_registered',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value.trim();
                                      if (value !== landlord?.msme_registered) {
                                        handleFieldChange('msme_registered', value);
                                      }
                                    }}
                                    placeholder='MSME Registration'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-text-sub-500'>PF Available</div>

                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full text-label-md text-text-strong-950'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(
                                        landlord,
                                        localChanges,
                                        'pf_available',
                                      ) || ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'pf_available',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value.trim();
                                      if (value !== landlord?.pf_available) {
                                        handleFieldChange('pf_available', value);
                                      }
                                    }}
                                    placeholder='PF Number'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-text-sub-500'>ESI Available</div>
                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full text-label-md text-text-strong-950'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(
                                        landlord,
                                        localChanges,
                                        'esi_available',
                                      ) || ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'esi_available',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value.trim();
                                      if (value !== landlord?.esi_available) {
                                        handleFieldChange('esi_available', value);
                                      }
                                    }}
                                    placeholder='ESI Number'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <div className='paragraph-small text-text-sub-500'>
                              Professional Tax
                            </div>
                            <EditableFieldWrapper editable={true} className='w-full'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 w-full text-label-md text-text-strong-950'
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={
                                      getLandlordFieldValue(
                                        landlord,
                                        localChanges,
                                        'professional_tax',
                                      ) || ''
                                    }
                                    onChange={(e) =>
                                      dispatch(
                                        setLandlordLocalChange({
                                          fieldName: 'professional_tax',
                                          value: e.target.value,
                                        }),
                                      )
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value.trim();
                                      if (value !== landlord?.professional_tax) {
                                        handleFieldChange('professional_tax', value);
                                      }
                                    }}
                                    placeholder='Professional Tax'
                                    className='w-full bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                          </div>
                        </div>
                      </div>
                    ) : aboutSidebar === 'bank' ? (
                      <div className='flex flex-col gap-4'>
                        <div className='w-full flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <RiBankLine size={20} className='text-text-sub-500' />
                            <span className='text-[var(--color-text-sub-500)]'>Bank Details</span>
                          </div>
                          <Button.Root
                            variant='neutral'
                            mode='stroke'
                            size='xsmall'
                            onClick={() => {
                              setEditingBank(null);
                              setAddBankModalOpen(true);
                            }}
                          >
                            <Button.Icon as={RiAddLine} className='mr-0.5' />
                            Add Bank
                          </Button.Root>
                        </div>
                        {landlord?.bank_account_details?.length > 0 ? (
                          <div className='grid  grid-cols-2 gap-3'>
                            {landlord?.bank_account_details?.map((bank, index) => {
                              const primaryCount =
                                landlord?.bank_account_details?.filter((b) => b?.is_primary)
                                  ?.length ?? 0;
                              const isOnlyPrimary = bank.is_primary && primaryCount === 1;
                              const isSettingPrimary =
                                settingPrimaryBankId === (bank.name ?? bank.docname);
                              return (
                                <div
                                  key={bank.name ?? index}
                                  className='flex flex-col border-stroke-soft-200 border rounded-xl group relative'
                                >
                                  <div className='w-full border-b border-stroke-soft-200 bg-bg-weak-100 rounded-t-xl flex items-center gap-3 pl-4 py-3 pr-3'>
                                    <RiBankLine size={20} />

                                    <div className='flex flex-col flex-1 min-w-0'>
                                      <div className='flex items-center gap-[6px]'>
                                        <span className='label-small text-[var(--color-text-main-900)]'>
                                          {bank.bank_name}
                                        </span>
                                        {bank.is_primary ? (
                                          <Badge.Root size='small' variant='stroke' color='green'>
                                            Primary
                                          </Badge.Root>
                                        ) : null}
                                      </div>

                                      <span className='label-xsmall text-[var(--color-text-soft-400)]'>
                                        {bank.account_number}
                                      </span>
                                    </div>
                                    <div className='flex items-center gap-2 shrink-0'>
                                      {!bank.is_primary && (
                                        <div className='flex items-center gap-2'>
                                          <Switch.Root
                                            id={`bank-primary-${bank.name ?? index}`}
                                            checked={false}
                                            disabled={isSettingPrimary}
                                            onCheckedChange={async (checked) => {
                                              if (!checked) return;
                                              const bankId = bank.name ?? bank.docname;
                                              if (!bankId || !id) return;
                                              setSettingPrimaryBankId(bankId);
                                              try {
                                                await dispatch(
                                                  updateLandlordBankDetailsThunk({
                                                    bank_id: bankId,
                                                    fields: { is_primary: 1 },
                                                  }),
                                                ).unwrap();
                                                showSuccessToast('Primary bank updated.');
                                                if (id) await dispatch(getLandlordDetailThunk(id));
                                              } catch (error) {
                                                showErrorToast(error, {
                                                  defaultMessage: 'Failed to set primary bank.',
                                                });
                                              } finally {
                                                setSettingPrimaryBankId(null);
                                              }
                                            }}
                                          />
                                          <Label.Root
                                            htmlFor={`bank-primary-${bank.name ?? index}`}
                                            className='text-label-sm text-text-main-900 cursor-pointer'
                                          >
                                            Set as Primary
                                          </Label.Root>
                                        </div>
                                      )}
                                      <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                        <Button.Root
                                          variant='neutral'
                                          mode='ghost'
                                          size='xsmall'
                                          onClick={() => {
                                            setEditingBank(bank);
                                            setAddBankModalOpen(true);
                                          }}
                                        >
                                          <Button.Icon as={RiPencilLine} size={16} />
                                        </Button.Root>
                                        <Button.Root
                                          variant='neutral'
                                          mode='ghost'
                                          size='xsmall'
                                          className='text-error-base hover:text-error-base'
                                          onClick={() => setBankToDelete(bank)}
                                          disabled={landlord?.bank_account_details?.length === 1}
                                          title={
                                            landlord?.bank_account_details?.length === 1
                                              ? 'At least one bank account is required'
                                              : undefined
                                          }
                                        >
                                          <Button.Icon as={RiDeleteBinLine} size={16} />
                                        </Button.Root>
                                      </div>
                                    </div>
                                  </div>

                                  <div className='p-4 grid grid-cols-2'>
                                    <div className='flex flex-col gap-1'>
                                      <span className='paragraph-xsmall text-[var(--color-text-sub-500)]'>
                                        Account Type
                                      </span>
                                      <span className='label-small text-[var(--color-text-main-900)]'>
                                        {bank.account_type || 'Saving'}
                                      </span>
                                    </div>

                                    <div className='flex flex-col gap-1'>
                                      <span className='paragraph-xsmall text-[var(--color-text-sub-500)]'>
                                        IFSC Code
                                      </span>
                                      <span className='label-small text-[var(--color-text-main-900)]'>
                                        {bank.ifsc_code}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-warning-base/5 p-8 text-center'>
                            <p className='text-paragraph-sm text-text-sub-600 font-medium'>
                              At least one bank account is required.
                            </p>
                            <p className='text-paragraph-xs text-text-sub-500 mt-1'>
                              Add bank details using the button above.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null
                  ) : (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                      {landlordDetail.error
                        ? 'Failed to load landlord details.'
                        : 'No landlord found.'}
                    </div>
                  )}
                </div>
              </div>
            </TabMenuHorizontal.Content>

            {/* Placeholder tabs */}
            <TabMenuHorizontal.Content
              value='agreements'
              className='flex-1 min-h-0 overflow-y-auto'
            >
              <ComingSoonMessage />
            </TabMenuHorizontal.Content>
            <TabMenuHorizontal.Content value='billing' className='flex-1 min-h-0 overflow-y-auto'>
              <ComingSoonMessage />
            </TabMenuHorizontal.Content>
            <TabMenuHorizontal.Content
              value='activities'
              className='flex-1 min-h-0 overflow-y-auto'
            >
              <ComingSoonMessage />
            </TabMenuHorizontal.Content>
          </TabMenuHorizontal.Root>
        </div>
      </div>

      <AddBankModal
        entityType='landlord'
        entityId={id}
        isOpen={addBankModalOpen}
        onOpenChange={(open) => {
          setAddBankModalOpen(open);
          if (!open) setEditingBank(null);
        }}
        editingBank={editingBank}
        existingBanks={landlord?.bank_account_details || landlord?.custom_bank_details || []}
        onSuccess={() => id && dispatch(getLandlordDetailThunk(id))}
      />

      <AddLandlordContactModal
        isOpen={addLandlordContactModalOpen}
        onOpenChange={(open) => {
          setAddLandlordContactModalOpen(open);
          if (!open) setEditingContact(null);
        }}
        landlordId={id}
        contact={editingContact}
        onSuccess={() => id && dispatch(getLandlordDetailThunk(id))}
      />

      {/* Delete bank confirmation */}
      <Modal.Root
        open={Boolean(bankToDelete)}
        onOpenChange={(open) => !open && setBankToDelete(null)}
      >
        <Modal.Content className='max-w-[450px]' showClose={false}>
          <Modal.Body className='px-5 py-6'>
            <div className='flex flex-col items-center gap-4'>
              <div className='flex items-center justify-center p-2 bg-warning-base/10 rounded-lg'>
                <RiAlertFill size={24} className='text-warning-base' />
              </div>
              <div className='flex flex-col gap-1 items-center text-center'>
                <h3 className='text-label-md text-text-sub-500'>Remove bank account?</h3>
                <p className='text-paragraph-sm text-text-sub-500'>
                  Are you sure you want to remove this bank account?
                </p>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => setBankToDelete(null)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                size='small'
                onClick={async () => {
                  if (!bankToDelete?.name || !id) return;
                  try {
                    const result = await dispatch(
                      deleteLandlordBankDetailsThunk({ landlord: id, bank_id: bankToDelete.name }),
                    );
                    if (deleteLandlordBankDetailsThunk.rejected.match(result)) {
                      showErrorToast(result.payload, {
                        defaultMessage: 'Failed to delete bank account. Please try again.',
                      });
                      return;
                    }
                    showSuccessToast('Bank account removed successfully.');
                    setBankToDelete(null);
                    if (id) await dispatch(getLandlordDetailThunk(id));
                  } catch (error) {
                    showErrorToast(error, {
                      defaultMessage: 'Failed to delete bank account. Please try again.',
                    });
                  }
                }}
              >
                Confirm
              </Button.Root>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Edit Address modal */}
      <Modal.Root
        open={Boolean(editingAddress)}
        onOpenChange={(open) => !open && setEditingAddress(null)}
      >
        <Modal.Content className='max-w-[450px] max-h-[90vh] overflow-hidden flex flex-col'>
          <Modal.Header
            icon={RiMapPin2Line}
            title='Edit Address'
            description='Update the address details below.'
          />
          <Modal.Body className='overflow-y-auto'>
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col gap-1'>
                <Label.Root>Address Line 1</Label.Root>
                <Input.Root size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      value={addressForm.address_line_1}
                      onChange={(e) =>
                        setAddressForm((previous) => ({
                          ...previous,
                          address_line_1: e.target.value,
                        }))
                      }
                      placeholder='Address line 1'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
              <div className='flex flex-col gap-1'>
                <Label.Root>Address Line 2</Label.Root>
                <Input.Root size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      value={addressForm.address_line_2}
                      onChange={(e) =>
                        setAddressForm((previous) => ({
                          ...previous,
                          address_line_2: e.target.value,
                        }))
                      }
                      placeholder='Address line 2'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
              <div className='flex flex-col gap-1'>
                <Label.Root>City</Label.Root>
                <Input.Root size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      value={addressForm.city}
                      onChange={(e) =>
                        setAddressForm((previous) => ({ ...previous, city: e.target.value }))
                      }
                      placeholder='City'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
              <div className='flex flex-col gap-1'>
                <Label.Root>State</Label.Root>
                <Input.Root size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      value={addressForm.state}
                      onChange={(e) =>
                        setAddressForm((previous) => ({ ...previous, state: e.target.value }))
                      }
                      placeholder='State'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
              <div className='flex flex-col gap-1'>
                <Label.Root>Pincode</Label.Root>
                <Input.Root size='medium'>
                  <Input.Wrapper>
                    <Input.Input
                      value={addressForm.pincode}
                      onChange={(e) =>
                        setAddressForm((previous) => ({ ...previous, pincode: e.target.value }))
                      }
                      placeholder='Pincode'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
              {primaryAddressFromList &&
                billingAddressFromList &&
                (editingAddress?.is_primary || editingAddress?.is_billing) && (
                  <div className='flex items-center gap-2 pt-2'>
                    <Checkbox.Root
                      id='billing-same-as-primary'
                      checked={billingSameAsPrimary}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setBillingSameAsPrimary(isChecked);
                        if (isChecked && primaryAddressFromList) {
                          setAddressForm({
                            address_line_1:
                              primaryAddressFromList.address_line_1 ||
                              primaryAddressFromList.address_line1 ||
                              '',
                            address_line_2:
                              primaryAddressFromList.address_line_2 ||
                              primaryAddressFromList.address_line2 ||
                              '',
                            city: primaryAddressFromList.city || '',
                            state: primaryAddressFromList.state || '',
                            pincode: primaryAddressFromList.pincode || '',
                          });
                        } else if (!isChecked && editingAddress) {
                          setAddressForm({
                            address_line_1:
                              editingAddress.address_line_1 || editingAddress.address_line1 || '',
                            address_line_2:
                              editingAddress.address_line_2 || editingAddress.address_line2 || '',
                            city: editingAddress.city || '',
                            state: editingAddress.state || '',
                            pincode: editingAddress.pincode || '',
                          });
                        }
                      }}
                    />
                    <Label.Root
                      htmlFor='billing-same-as-primary'
                      className='text-paragraph-sm text-text-sub-500 cursor-pointer'
                    >
                      Billing address same as primary address
                    </Label.Root>
                  </div>
                )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => setEditingAddress(null)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                size='small'
                onClick={async () => {
                  if (!editingAddress?.name) return;
                  const fields = {
                    address_line_1: addressForm.address_line_1,
                    address_line_2: addressForm.address_line_2,
                    city: addressForm.city,
                    state: addressForm.state,
                    pincode: addressForm.pincode,
                  };
                  try {
                    const result = await dispatch(
                      updateLandlordAddressThunk({
                        address_id: editingAddress.name,
                        fields,
                      }),
                    );
                    if (updateLandlordAddressThunk.rejected.match(result)) {
                      showErrorToast(result.payload, {
                        defaultMessage: 'Failed to update address. Please try again.',
                      });
                      return;
                    }
                    if (
                      billingSameAsPrimary &&
                      billingAddressFromList?.name &&
                      editingAddress.name !== billingAddressFromList.name
                    ) {
                      const billingResult = await dispatch(
                        updateLandlordAddressThunk({
                          address_id: billingAddressFromList.name,
                          fields,
                        }),
                      );
                      if (updateLandlordAddressThunk.rejected.match(billingResult)) {
                        showErrorToast(billingResult.payload, {
                          defaultMessage: 'Failed to update billing address.',
                        });
                        setEditingAddress(null);
                        if (id) await dispatch(getLandlordDetailThunk(id));
                        return;
                      }
                    }
                    showSuccessToast('Address updated successfully.');
                    setEditingAddress(null);
                    if (id) await dispatch(getLandlordDetailThunk(id));
                  } catch (error) {
                    showErrorToast(error, {
                      defaultMessage: 'Failed to update address. Please try again.',
                    });
                  }
                }}
              >
                Update
              </Button.Root>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </PageLayout>
  );
};

export default LandlordDetailPage;
