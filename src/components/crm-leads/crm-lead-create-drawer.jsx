import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  RiMoneyDollarCircleLine,
  RiInformationFill,
  RiInformationLine,
  RiMapPinLine,
  RiFileTextLine,
  RiArrowRightSLine,
  RiRecordCircleLine,
  RiBuildingLine,
  RiUserLine,
  RiBuilding2Line,
  RiContactsLine,
  RiAddLine,
} from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as Tooltip from '@/components/ui/tooltip';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Modal from '@/components/ui/modal';
import * as Tag from '@/components/ui/tag';
import { PhoneInputController } from '@/components/ui/phone-input';
import { Datepicker } from '@/components/ui/datepicker';
import { parseToDate } from '@/utils/date-utils';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import {
  formatNumberInrForInput,
  SELECT_NONE_VALUE,
  TRUEPULSE_SERVICE_OPTIONS,
  getServiceName,
  isPhiBrand,
  resolvePhiPipeline,
  resolvePhiProduct,
  LEAD_TEMPERATURE_COLORS,
  LEAD_TEMPERATURE_ICONS,
  LEAD_TEMPERATURE_OPTIONS,
} from './constants';
import { CityCombobox } from './city-combobox';
import { StageColorPill } from '@/components/crm-leads/lead-pipeline-edit-popover';
import {
  createCrmLead,
  getCrmContactList,
  getCrmLeadOptions,
  getCrmStages,
  getSalesOwnerList,
  getInsideSalesList,
  getPrimaryLeadForContact,
  getCpAccountOptions,
  getCpContactsForCpAccount,
  getCpContactLinkOptions,
} from '@/api/crmLeads';
import {
  getCrmAccountList,
  getCrmAccountContacts,
  getCrmAccount,
  createCrmAccount,
} from '@/api/crmAccounts';
import { getCrmContact, createCrmContact } from '@/api/crmContacts';
import {
  getCpAccountById,
  createCpAccount,
  getCpAccountTypeOptions,
} from '@/services/cp-accounts-service';
import { getCpContactById, createCpContact } from '@/services/cp-contacts-service';
import {
  deriveOperationalStatesDisplay,
  getOperationalCitiesFromRow,
} from '@/pages/channel-partner/cp-operational-location-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useSelector } from 'react-redux';
import { selectCenterAccess } from '@/redux/centerSlice';

function LeadTemperatureBadge({ value, label, icon: Icon, color }) {
  if (!value || !color) {
    return <RiRecordCircleLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />;
  }
  const bg = `${color}20`;
  const border = `${color}60`;
  return (
    <div
      className='inline-flex w-max shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-paragraph-xs font-medium leading-normal'
      style={{ backgroundColor: bg, borderColor: border, color }}
    >
      {Icon && <Icon className='size-3.5 shrink-0' aria-hidden />}
      {label ?? value}
    </div>
  );
}

const leadSchema = z.object({
  lead_name: z.string().min(1, 'Lead name is required'),
  lead_of: z.string().optional(),
  associate_account: z.string().optional(),
  associate_contact: z.string().optional(),
  cp_account: z.string().optional(),
  cp_contact: z.string().optional(),
  lead_size: z.string().optional(),
  no_of_seats: z.string().optional(),
  product: z.string().optional(),
  city: z.string().optional(),
  est_monthly_value: z.string().optional(),
  est_lifetime_value: z.string().optional(),
  pipeline: z.string().min(1, 'Pipeline is required'),
  lifecycle_stage: z.string().min(1, 'Lifecycle stage is required'),
  life_cycle_stage_status: z.string().min(1, 'Lifecycle stage status is required'),
  lead_temperature: z.string().optional(),
  lost_reason: z.string().optional(),
  sales_owner: z.string().optional(),
  inside_sales: z.string().optional(),
  lead_relevance: z.string().optional(),
  need_urgency: z.string().optional(),
  info_call_status: z.string().optional(),
  external_id: z.string().optional(),
  service_id: z.string().optional(),
  service_name: z.string().optional(),
  lead_source: z.string().optional(),
  campaign: z.string().optional(),
  source: z.string().optional(),
  medium: z.string().optional(),
  term: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  gclid: z.string().optional(),
  ad_group: z.string().optional(),
  landing_page_url: z.string().optional(),
  contact_from_url: z.string().optional(),
  message: z.string().optional(),
  contact_subject: z.string().optional(),
  delacon_info_date: z.string().optional(),
  delacon_info_termination_point: z.string().optional(),
  delacon_info_call_status: z.string().optional(),
  delacon_web_info_search_engine: z.string().optional(),
  delacon_web_info_search_type: z.string().optional(),
  delacon_city: z.string().optional(),
  delacon_adwords_info_conversions: z.string().optional(),
  delacon_adwords_info_cpc: z.string().optional(),
  delacon_adwords_info_cost: z.string().optional(),
  delacon_info_caller: z.string().optional(),
  delacon_adwords_info_clicks: z.string().optional(),
  delacon_call_recording: z.string().optional(),
  delacon_landing_page: z.string().optional(),
  delacon_web_info_page_called_from: z.string().optional(),
  delacon_inside_sales_fr_tat: z.string().optional(),
  delacon_sales_fr_tat: z.string().optional(),
});

const defaultValues = {
  lead_name: '',
  lead_of: '',
  associate_account: '',
  associate_contact: '',
  cp_account: '',
  cp_contact: '',
  lead_size: '',
  no_of_seats: '',
  product: '',
  city: '',
  est_monthly_value: '',
  est_lifetime_value: '',
  pipeline: '',
  lifecycle_stage: '',
  life_cycle_stage_status: '',
  lead_temperature: 'Hot',
  lost_reason: '',
  sales_owner: '',
  inside_sales: '',
  lead_relevance: '',
  need_urgency: '',
  info_call_status: '',
  external_id: '',
  service_id: '',
  service_name: '',
  lead_source: '',
  campaign: '',
  source: '',
  medium: '',
  term: '',
  content: '',
  tags: [],
  gclid: '',
  ad_group: '',
  landing_page_url: '',
  contact_from_url: '',
  message: '',
  contact_subject: '',
  delacon_info_date: '',
  delacon_info_termination_point: '',
  delacon_info_call_status: '',
  delacon_web_info_search_engine: '',
  delacon_web_info_search_type: '',
  delacon_city: '',
  delacon_adwords_info_conversions: '',
  delacon_adwords_info_cpc: '',
  delacon_adwords_info_cost: '',
  delacon_info_caller: '',
  delacon_adwords_info_clicks: '',
  delacon_call_recording: '',
  delacon_landing_page: '',
  delacon_web_info_page_called_from: '',
  delacon_inside_sales_fr_tat: '',
  delacon_sales_fr_tat: '',
};

const FieldLabel = ({ children, required }) => (
  <Label.Root className='text-paragraph-sm font-medium text-text-sub-600 mb-1'>
    {children}
    {required && <span className='text-error-base ml-0.5'>*</span>}
  </Label.Root>
);

const SectionTitle = ({ icon, children }) => (
  <div className='flex items-center gap-2 mb-4'>
    <span className='text-text-sub-400'>{icon}</span>
    <span className='text-paragraph-sm font-semibold text-text-sub-600'>{children}</span>
  </div>
);

/** Same avatar stack + tooltip as CRM Account detail: 3 visible, then +N */
function ContactsAvatars({ list }) {
  const visible = list.slice(0, 3);
  const extra = list.length - visible.length;

  const renderContactsList = (contactsToShow) => (
    <div className='flex flex-col gap-3'>
      <span className='text-label-xs text-text-sub-500 font-medium'>Related contacts</span>
      {contactsToShow.map((contact, index) => {
        const name = contact?.full_name || contact?.name || '—';
        return (
          <div
            key={contact?.name ? `${contact.name}-${index}` : index}
            className='flex items-center gap-2 min-w-0'
          >
            <CrmAccountAvatar name={name} index={index} size={32} className='shrink-0' />
            <div className='flex flex-col min-w-0'>
              <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                {name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className='flex items-center'>
      {extra === 0 ? (
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
            <span className='inline-flex items-center'>
              {visible.map((contact, i) => (
                <span
                  key={contact?.name ?? i}
                  className='inline-block ring-2 ring-white rounded-full'
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                >
                  <CrmAccountAvatar
                    name={contact?.full_name || contact?.name}
                    index={i}
                    size={24}
                  />
                </span>
              ))}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side='top' variant='light' size='medium' className='max-w-[280px] p-3'>
            {renderContactsList(list)}
          </Tooltip.Content>
        </Tooltip.Root>
      ) : (
        <>
          {visible.map((contact, i) => {
            const name = contact?.full_name || contact?.name;
            return (
              <Tooltip.Root key={contact?.name ?? i}>
                <Tooltip.Trigger asChild>
                  <span
                    className='inline-block ring-2 ring-white rounded-full'
                    style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                  >
                    <CrmAccountAvatar name={name} index={i} size={24} />
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex items-center gap-2 min-w-0'>
                    <CrmAccountAvatar name={name} index={i} size={32} className='shrink-0' />
                    <div className='flex flex-col min-w-0'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {name || '—'}
                      </span>
                    </div>
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            );
          })}
          <Tooltip.Root delayDuration={0}>
            <Tooltip.Trigger asChild>
              <span
                className='inline-block ring-2 ring-white rounded-full cursor-default'
                style={{ marginLeft: -8, zIndex: visible.length }}
              >
                <CrmAccountAvatar
                  name={`+${extra}`}
                  index={0}
                  initials={`+${extra}`}
                  size={24}
                  className='bg-neutral-200 text-neutral-700 shadow-[inset_0px_-8px_16px_0px_rgba(197,199,201,0.48)]'
                />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='top' variant='light' size='medium' className='max-w-[280px] p-3'>
              {renderContactsList(list)}
            </Tooltip.Content>
          </Tooltip.Root>
        </>
      )}
    </div>
  );
}

const TABS = [
  { id: 'basic', label: 'Basic Details', icon: RiInformationFill },
  { id: 'utm', label: 'UTM Details', icon: RiMapPinLine },
  { id: 'delacon', label: 'Delacon Details', icon: RiFileTextLine },
  { id: 'account', label: 'Account', icon: RiBuildingLine },
  { id: 'contact', label: 'Contact', icon: RiUserLine },
  { id: 'cp_account', label: 'CP Account', icon: RiBuilding2Line },
  { id: 'cp_contact', label: 'CP Contact', icon: RiContactsLine },
];

const ACCOUNT_TAB_DEFAULTS = {
  account_name: '',
  company_legal_name: '',
  sales_owner: '',
  crm_contact: [],
  cp_account: '',
  cp_contact: '',
  year_of_establishment: '',
  type_of_organization: '',
  industry: '',
  parent_company: '',
  associate_company: '',
  website: '',
  no_of_employees: '',
};

const ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS = {
  sales_owner: [],
  crm_contact: [],
  cp_account: [],
  cp_contact: [],
  type_of_organization: [],
  industry: [],
  parent_company: [],
  associate_company: [],
  no_of_employees: [],
};

function linkFieldToValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') return String(value.name || value.value || '').trim();
  return String(value).trim();
}

function linkFieldToLabel(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    return String(value.label || value.customer_name || value.full_name || value.name || '').trim();
  }
  return String(value).trim();
}

function optionFromValue(value, label) {
  const v = linkFieldToValue(value);
  if (!v) return null;
  return { value: v, label: label || linkFieldToLabel(value) || v };
}

function mapCrmAccountToTabFields(account, contacts = []) {
  const contactOptions = (contacts || [])
    .map((c) => ({
      value: c.name || c.value || '',
      label: c.full_name || c.label || c.name || c.value || '—',
    }))
    .filter((o) => o.value);

  const parent = optionFromValue(account?.parent_company);
  const associate = optionFromValue(account?.associate_company);
  const salesOwner = optionFromValue(account?.sales_owner);
  const cpAccount = optionFromValue(account?.cp_account);
  const cpContact = optionFromValue(account?.cp_contact);
  const typeOfOrg = optionFromValue(account?.type_of_organization);
  const industry = optionFromValue(account?.industry);
  const employees = optionFromValue(account?.no_of_employees);

  return {
    fields: {
      account_name: account?.legal_name || account?.customer_name || '',
      company_legal_name: account?.custom_legal_name || '',
      sales_owner: salesOwner?.value || '',
      crm_contact: contactOptions.map((o) => o.value),
      cp_account: cpAccount?.value || '',
      cp_contact: cpContact?.value || '',
      year_of_establishment: account?.year_of_establishment
        ? String(account.year_of_establishment)
        : '',
      type_of_organization: typeOfOrg?.value || '',
      industry: industry?.value || '',
      parent_company: parent?.value || '',
      associate_company: associate?.value || '',
      website: account?.website || '',
      no_of_employees: employees?.value || '',
    },
    options: {
      sales_owner: salesOwner ? [salesOwner] : [],
      crm_contact: contactOptions,
      cp_account: cpAccount ? [cpAccount] : [],
      cp_contact: cpContact ? [cpContact] : [],
      type_of_organization: typeOfOrg ? [typeOfOrg] : [],
      industry: industry ? [industry] : [],
      parent_company: parent ? [parent] : [],
      associate_company: associate ? [associate] : [],
      no_of_employees: employees ? [employees] : [],
    },
  };
}

const CONTACT_TAB_DEFAULTS = {
  first_name: '',
  last_name: '',
  department: '',
  designation: '',
  email: '',
  date_of_birth: '',
  mobile_number: '',
  alt_mobile_number: '',
  city: '',
  sales_owner: '',
  associate_account: '',
  cp_account: '',
  cp_contact: '',
};

const CONTACT_TAB_SELECT_OPTIONS_DEFAULTS = {
  department: [],
  designation: [],
  sales_owner: [],
  associate_account: [],
  cp_account: [],
  cp_contact: [],
};

function mapCrmContactToTabFields(contact) {
  const department = optionFromValue(contact?.department);
  const designation = optionFromValue(contact?.designation);
  const salesOwner = optionFromValue(contact?.sales_owner);
  const associateAccount = optionFromValue(contact?.associate_account || contact?.account);
  const cpAccount = optionFromValue(contact?.cp_account);
  const cpContact = optionFromValue(contact?.cp_contact);

  return {
    fields: {
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      department: department?.value || '',
      designation: designation?.value || '',
      email: contact?.email || contact?.email_id || '',
      date_of_birth: contact?.dob ? String(contact.dob) : '',
      mobile_number: contact?.mobile_number || '',
      alt_mobile_number: contact?.alt_mobile_number || '',
      city: contact?.city || '',
      sales_owner: salesOwner?.value || '',
      associate_account: associateAccount?.value || '',
      cp_account: cpAccount?.value || '',
      cp_contact: cpContact?.value || '',
    },
    options: {
      department: department ? [department] : [],
      designation: designation ? [designation] : [],
      sales_owner: salesOwner ? [salesOwner] : [],
      associate_account: associateAccount ? [associateAccount] : [],
      cp_account: cpAccount ? [cpAccount] : [],
      cp_contact: cpContact ? [cpContact] : [],
    },
  };
}

const CP_ACCOUNT_TAB_DEFAULTS = {
  name: '',
  brand_name: '',
  type: '',
  cp_contacts: [],
  year_of_establishment: '',
  industry: '',
  parent_company: '',
  associate_company: '',
  website: '',
  no_of_employees: '',
  rera_number: '',
  operational_city: '',
  operational_state: '',
};

const CP_CONTACT_TAB_DEFAULTS = {
  name: '',
  email: '',
  date_of_birth: '',
  age: '',
  mobile_number: '',
  alt_mobile_number: '',
  associate_cp_account: '',
  sales_owner: '',
  reporting_manager: '',
  designation: '',
  department: '',
  city: '',
  primary_contact: '',
  open_leads_amount: '',
  won_amount: '',
};

const CP_ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS = {
  type: [],
  cp_contacts: [],
  industry: [],
  parent_company: [],
  associate_company: [],
};

const CP_CONTACT_TAB_SELECT_OPTIONS_DEFAULTS = {
  sales_owner: [],
  reporting_manager: [],
  associate_cp_account: [],
};

function formatCityList(value) {
  if (Array.isArray(value)) {
    return value
      .map((c) => (typeof c === 'string' ? c : c?.city || c?.label || c?.name || ''))
      .map((s) => String(s).trim())
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'string') return value.trim();
  return '';
}

function mapCpAccountToTabFields(account) {
  const contacts = (account?.contacts || [])
    .map((c, i) => ({
      value: String(c?.id || c?.name || c?.email || `cp-contact-${i}`).trim(),
      label: String(c?.name || c?.fullName || c?.email || c?.initials || c?.id || '—').trim(),
    }))
    .filter((o) => o.value);
  const type = optionFromValue(account?.type);
  const industry = optionFromValue(account?.industry);
  const parent = optionFromValue(account?.parentCompany);
  const associate = optionFromValue(account?.associateCompany);
  const cities = getOperationalCitiesFromRow(account);
  const operationalCity = cities.join(', ');
  const operationalState =
    String(account?.operationalState || '').trim() || deriveOperationalStatesDisplay(cities);

  return {
    fields: {
      name: account?.legalName || account?.name || '',
      brand_name: account?.brandName || '',
      type: type?.value || '',
      cp_contacts: contacts.map((o) => o.value),
      year_of_establishment:
        account?.yearOfEstablishment != null && account?.yearOfEstablishment !== ''
          ? String(account.yearOfEstablishment)
          : '',
      industry: industry?.value || '',
      parent_company: parent?.value || '',
      associate_company: associate?.value || '',
      website: account?.website || '',
      no_of_employees:
        account?.noOfEmployees != null && account?.noOfEmployees !== ''
          ? String(account.noOfEmployees)
          : '',
      rera_number: account?.reraNumber || '',
      operational_city: operationalCity,
      operational_state: operationalState,
    },
    options: {
      type: type ? [type] : [],
      cp_contacts: contacts,
      industry: industry ? [industry] : [],
      parent_company: parent ? [parent] : [],
      associate_company: associate ? [associate] : [],
    },
  };
}

function mapCpContactToTabFields(contact) {
  const salesOwner = optionFromValue(contact?.salesOwner);
  const reportingManager = optionFromValue(
    contact?.reportingManagerName
      ? { name: contact.reportingManager, label: contact.reportingManagerName }
      : contact?.reportingManager,
  );
  const associateAccount = optionFromValue(
    contact?.cpAccount
      ? { name: contact.cpAccountId || contact.cpAccount, label: contact.cpAccount }
      : contact?.cpAccountId,
  );
  const ageRaw = contact?.age;
  let age = '';
  if (ageRaw != null && ageRaw !== '') {
    const ageStr = String(ageRaw).trim();
    age = /year/i.test(ageStr) ? ageStr : `${ageStr} Years`;
  }
  const primary =
    contact?.primaryContact === true ||
    contact?.primaryContact === 1 ||
    String(contact?.primaryContact || '').toLowerCase() === 'yes'
      ? 'Yes'
      : contact?.primaryContact === false ||
          contact?.primaryContact === 0 ||
          String(contact?.primaryContact || '').toLowerCase() === 'no'
        ? 'No'
        : contact?.primaryContact
          ? String(contact.primaryContact)
          : '';

  return {
    fields: {
      name:
        contact?.name || [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || '',
      email: contact?.email || '',
      date_of_birth: contact?.dateOfBirth ? String(contact.dateOfBirth) : '',
      age,
      mobile_number: contact?.mobileNumber || '',
      alt_mobile_number: contact?.altMobileNumber || '',
      associate_cp_account: associateAccount?.value || '',
      sales_owner: salesOwner?.value || '',
      reporting_manager: reportingManager?.value || '',
      designation: contact?.designation || '',
      department: contact?.department || '',
      city: formatCityList(contact?.city),
      primary_contact: primary,
      open_leads_amount:
        contact?.openLeadsAmount != null && contact?.openLeadsAmount !== ''
          ? String(contact.openLeadsAmount)
          : '',
      won_amount:
        contact?.wonAmount != null && contact?.wonAmount !== '' ? String(contact.wonAmount) : '',
    },
    options: {
      sales_owner: salesOwner ? [salesOwner] : [],
      reporting_manager: reportingManager ? [reportingManager] : [],
      associate_cp_account: associateAccount ? [associateAccount] : [],
    },
  };
}

const CrmLeadCreateDrawer = ({
  open,
  onOpenChange,
  onSuccess,
  leadOptions: leadOptionsProp = {},
  defaultCpAccountId = '',
  defaultCpAccountLabel = '',
  defaultCpContactId = '',
  lockCpAccount = false,
  lockCpContact = false,
  cpContactOptions = [],
  fixedAccount,
  fixedContact,
  /** CRM Stages Pipeline doc name — when opening the drawer, pre-select this pipeline if valid. */
  defaultPipelineId = '',
  /** CRM Status Master stage doc name — when opening and pipeline matches `defaultPipelineId`, pre-select this stage. */
  defaultLifecycleStageId = '',
}) => {
  const fromCpAccount = Boolean(defaultCpAccountId && String(defaultCpAccountId).trim());
  const useFixedAccount = Boolean(fixedAccount && String(fixedAccount).trim());
  const useFixedContact = Boolean(fixedContact && String(fixedContact).trim());
  const centerAccess = useSelector(selectCenterAccess);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [accountTabFields, setAccountTabFields] = useState(ACCOUNT_TAB_DEFAULTS);
  const [accountTabSelectOptions, setAccountTabSelectOptions] = useState(
    ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS,
  );
  const [contactTabFields, setContactTabFields] = useState(CONTACT_TAB_DEFAULTS);
  const [contactTabSelectOptions, setContactTabSelectOptions] = useState(
    CONTACT_TAB_SELECT_OPTIONS_DEFAULTS,
  );
  const [cpAccountTabFields, setCpAccountTabFields] = useState(CP_ACCOUNT_TAB_DEFAULTS);
  const [cpAccountTabSelectOptions, setCpAccountTabSelectOptions] = useState(
    CP_ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS,
  );
  const [cpContactTabFields, setCpContactTabFields] = useState(CP_CONTACT_TAB_DEFAULTS);
  const [cpContactTabSelectOptions, setCpContactTabSelectOptions] = useState(
    CP_CONTACT_TAB_SELECT_OPTIONS_DEFAULTS,
  );
  const [accountOptions, setAccountOptions] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [fetchedLeadOptions, setFetchedLeadOptions] = useState({});
  const [lostReasonOptionsForStatus, setLostReasonOptionsForStatus] = useState([]);
  const [fetchedCpAccountOptions, setFetchedCpAccountOptions] = useState([]);
  const [fetchedCpContactOptions, setFetchedCpContactOptions] = useState([]);
  const allContactsRef = useRef([]);
  const creatingAccountRef = useRef(false);
  const creatingContactRef = useRef(false);
  const creatingCpAccountRef = useRef(false);
  const creatingCpContactRef = useRef(false);
  const [primaryLeadModal, setPrimaryLeadModal] = useState({
    open: false,
    existingLeadName: '',
    pendingData: null,
  });
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createContactModal, setCreateContactModal] = useState({
    open: false,
    first_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
  });
  const [createContactErrors, setCreateContactErrors] = useState({});
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [createCpAccountModal, setCreateCpAccountModal] = useState({
    open: false,
    name: '',
    brand_name: '',
    type: '',
  });
  const [createCpAccountErrors, setCreateCpAccountErrors] = useState({});
  const [isCreatingCpAccount, setIsCreatingCpAccount] = useState(false);
  const [cpAccountTypeOptions, setCpAccountTypeOptions] = useState([]);
  const [createCpContactModal, setCreateCpContactModal] = useState({
    open: false,
    first_name: '',
    last_name: '',
  });
  const [createCpContactErrors, setCreateCpContactErrors] = useState({});
  const [isCreatingCpContact, setIsCreatingCpContact] = useState(false);
  // console.log('defaultCpAccountLabel is ....', defaultCpAccountLabel);
  // console.log('defaultCpAccountId is ....', defaultCpAccountId);
  // console.log('lockCpAccount is ....', lockCpAccount);

  const {
    control,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const leadOptions =
    Object.keys(leadOptionsProp).length > 0 ? leadOptionsProp : fetchedLeadOptions;
  const associateAccount = useWatch({ control, name: 'associate_account' });
  const associateContact = useWatch({ control, name: 'associate_contact' });
  const watchedCpAccount = useWatch({ control, name: 'cp_account' });
  const watchedCpContact = useWatch({ control, name: 'cp_contact' });
  const watchedPipeline = useWatch({ control, name: 'pipeline' });
  const watchedProduct = useWatch({ control, name: 'product' });
  const lifecycleStage = useWatch({ control, name: 'lifecycle_stage' });
  const statusValue = useWatch({ control, name: 'life_cycle_stage_status' });
  const lostReasonValue = useWatch({ control, name: 'lost_reason' });
  const tagArray = useWatch({ control, name: 'tags' }) || [];
  const [pipelineScopedStages, setPipelineScopedStages] = useState(null);
  const [pipelineScopedLinkOptions, setPipelineScopedLinkOptions] = useState({
    lead_relevance: [],
    lead_size: [],
    product: [],
  });
  const prevPipelineSyncRef = useRef(null);
  const prevPipelineLinkOptionsRef = useRef(null);
  const phiAutoSetRef = useRef({ pipeline: false, product: false });
  /** Snapshot of list-view pipeline/stage when drawer opens (used once per open for defaults). */
  const tabDefaultsRef = useRef({ pipeline: '', stage: '' });
  const watchedSource = useWatch({ control, name: 'source' });
  const watchedLeadSource = useWatch({ control, name: 'lead_source' });
  const watchedLeadOf = useWatch({ control, name: 'lead_of' });

  useEffect(() => {
    const val = watchedLeadOf;
    const isPhi = isPhiBrand(val);

    if (isPhi) {
      const targetPipeline = resolvePhiPipeline(leadOptions.pipelines);
      const currentPipeline = getValues('pipeline');

      if (currentPipeline !== targetPipeline) {
        setValue('pipeline', targetPipeline);
        phiAutoSetRef.current.pipeline = true;
      }

      const productOpts =
        pipelineScopedLinkOptions.product?.length > 0
          ? pipelineScopedLinkOptions.product
          : leadOptions.product;
      const targetProduct = resolvePhiProduct(productOpts);
      const currentProduct = getValues('product');

      if (currentProduct !== targetProduct) {
        setValue('product', targetProduct);
        phiAutoSetRef.current.product = true;
      }
    } else {
      if (phiAutoSetRef.current.pipeline) {
        if (getValues('pipeline') === resolvePhiPipeline(leadOptions.pipelines)) {
          setValue('pipeline', '');
        }
        phiAutoSetRef.current.pipeline = false;
      }
      if (phiAutoSetRef.current.product) {
        const productOpts =
          pipelineScopedLinkOptions.product?.length > 0
            ? pipelineScopedLinkOptions.product
            : leadOptions.product;
        if (getValues('product') === resolvePhiProduct(productOpts)) {
          setValue('product', '');
        }
        phiAutoSetRef.current.product = false;
      }
    }
  }, [
    watchedLeadOf,
    watchedPipeline,
    pipelineScopedLinkOptions.product,
    leadOptions.pipelines,
    leadOptions.product,
    getValues,
    setValue,
  ]);

  useEffect(() => {
    if (!watchedLeadSource) {
      const src = (watchedSource || '').trim().toLowerCase();
      if (src.includes('truepulse') || src.includes('true pulse')) {
        setValue('lead_source', 'Direct Call');
      } else if (src.includes('chat360')) {
        setValue('lead_source', 'Chat_tool');
      } else if (src.includes('webflow')) {
        setValue('lead_source', 'Website');
      } else if (
        src.includes('meta ads') ||
        src === 'meta' ||
        src.includes('facebook') ||
        src.includes('instagram')
      ) {
        setValue('lead_source', 'Paid Ads');
      }
    }
  }, [watchedSource, watchedLeadSource, setValue]);

  useEffect(() => {
    if (watchedProduct && leadOptions.product_to_pipeline_map) {
      const mappedPipeline = leadOptions.product_to_pipeline_map[watchedProduct];
      if (mappedPipeline) {
        setValue('pipeline', mappedPipeline);
      }
    }
  }, [watchedProduct, leadOptions.product_to_pipeline_map, setValue]);

  const pipelineTrim = (watchedPipeline || '').trim();
  const isStatusDisabled = !pipelineTrim || !lifecycleStage || String(lifecycleStage).trim() === '';
  const stageOptions = pipelineScopedStages?.stages?.length ? pipelineScopedStages.stages : [];
  const statusOptions = isStatusDisabled
    ? []
    : (pipelineScopedStages?.stageStatusMap?.[lifecycleStage] ?? []);
  const statusLower = statusValue ? String(statusValue).toLowerCase().trim() : '';
  const showLostReason = Boolean(
    statusLower && (statusLower.includes('lost') || statusLower.includes('drop')),
  );

  useEffect(() => {
    if (!showLostReason || !statusValue || String(statusValue).trim() === '') {
      setLostReasonOptionsForStatus([]);
      return;
    }
    let cancelled = false;
    getCrmLeadOptions(statusValue, watchedPipeline)
      .then((opts) => {
        if (!cancelled)
          setLostReasonOptionsForStatus(Array.isArray(opts.lost_reason) ? opts.lost_reason : []);
      })
      .catch(() => {
        if (!cancelled) setLostReasonOptionsForStatus([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showLostReason, statusValue, watchedPipeline]);

  useEffect(() => {
    if (!open) {
      setPipelineScopedLinkOptions({
        lead_relevance: [],
        lead_size: [],
        product: [],
      });
      prevPipelineLinkOptionsRef.current = null;
      return;
    }

    const pv = String(watchedPipeline || '').trim();
    if (!pv) {
      setPipelineScopedLinkOptions({
        lead_relevance: [],
        lead_size: [],
        product: [],
      });
      return;
    }

    if (prevPipelineLinkOptionsRef.current !== null && prevPipelineLinkOptionsRef.current !== pv) {
      setValue('lead_relevance', '');
      setValue('lead_size', '');
      setValue('product', '');
    }
    prevPipelineLinkOptionsRef.current = pv;

    let cancelled = false;
    getCrmLeadOptions(undefined, pv)
      .then((opts) => {
        if (cancelled) return;
        setPipelineScopedLinkOptions({
          lead_relevance: Array.isArray(opts.lead_relevance) ? opts.lead_relevance : [],
          lead_size: Array.isArray(opts.lead_size) ? opts.lead_size : [],
          product: Array.isArray(opts.product) ? opts.product : [],
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPipelineScopedLinkOptions({
            lead_relevance: [],
            lead_size: [],
            product: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, watchedPipeline, setValue]);

  const lostReasonSelectOptions = useMemo(() => {
    const raw = lostReasonOptionsForStatus;
    const fv = lostReasonValue ? String(lostReasonValue).trim() : '';
    if (fv && !raw.some((o) => o.value === fv)) {
      return [{ value: fv, label: fv }, ...raw];
    }
    return raw;
  }, [lostReasonOptionsForStatus, lostReasonValue]);

  // console.log('fetchedCpAccountOptions is ....', fetchedCpAccountOptions);
  // console.log('watchedCpAccount is ....', watchedCpAccount);

  const cpAccountOptionsForSelect = useMemo(() => {
    const raw = fetchedCpAccountOptions;
    const fv = watchedCpAccount ? String(watchedCpAccount).trim() : '';
    // console.log('fv is ....', fv);
    if (fv && !raw.some((o) => o.value === fv)) {
      return [{ value: fv, label: fv }, ...raw];
    }
    // console.log('raw is ....', raw);
    return raw;
  }, [fetchedCpAccountOptions, watchedCpAccount]);
  // console.log('cpAccountOptionsForSelect is ....', cpAccountOptionsForSelect);

  const effectiveCpContactSelectOptions = useMemo(() => {
    if (lockCpContact) {
      if (cpContactOptions.length > 0) return cpContactOptions;
      const id = String(defaultCpContactId || watchedCpContact || '').trim();
      return id ? [{ value: id, label: id }] : [];
    }
    const raw = fetchedCpContactOptions;
    const fv = watchedCpContact ? String(watchedCpContact).trim() : '';
    if (fv && !raw.some((o) => o.value === fv)) {
      return [{ value: fv, label: fv }, ...raw];
    }
    return raw;
  }, [
    lockCpContact,
    cpContactOptions,
    fetchedCpContactOptions,
    watchedCpContact,
    defaultCpContactId,
  ]);

  useEffect(() => {
    if (lifecycleStage && statusValue && statusOptions.length > 0) {
      const valid = statusOptions.some((o) => o.value === statusValue);
      if (!valid) setValue('life_cycle_stage_status', '');
    } else if (lifecycleStage && statusOptions.length === 0 && statusValue) {
      setValue('life_cycle_stage_status', '');
    }
    const statusValueLower = statusValue ? String(statusValue).toLowerCase().trim() : '';
    if (!(
      statusValueLower &&
      (statusValueLower.includes('lost') || statusValueLower.includes('drop'))
    )) {
      setValue('lost_reason', '');
    }
  }, [lifecycleStage, statusOptions, statusValue, setValue]);

  useEffect(() => {
    if (!open) return;
    setShowMoreFields(false);
    setActiveTab('basic');
    setAccountTabFields(ACCOUNT_TAB_DEFAULTS);
    setAccountTabSelectOptions(ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
    setContactTabFields(CONTACT_TAB_DEFAULTS);
    setContactTabSelectOptions(CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
    setCpAccountTabFields(CP_ACCOUNT_TAB_DEFAULTS);
    setCpAccountTabSelectOptions(CP_ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
    setCpContactTabFields(CP_CONTACT_TAB_DEFAULTS);
    setCpContactTabSelectOptions(CP_CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
    prevPipelineSyncRef.current = null;
    prevPipelineLinkOptionsRef.current = null;
    phiAutoSetRef.current = { pipeline: false, product: false };
    setPipelineScopedStages(null);
    setPipelineScopedLinkOptions({
      lead_relevance: [],
      lead_size: [],
      product: [],
    });
    const stageRaw = String(defaultLifecycleStageId || '').trim();
    tabDefaultsRef.current = {
      pipeline: String(defaultPipelineId || '').trim(),
      stage: stageRaw && stageRaw !== 'all' ? stageRaw : '',
    };
    reset(defaultValues);
  }, [open, reset, defaultPipelineId, defaultLifecycleStageId]);

  useEffect(() => {
    if (!open) return;
    const pipes = leadOptions.pipelines;
    if (!Array.isArray(pipes) || pipes.length === 0) return;
    const cur = getValues('pipeline');
    if ((cur || '').trim()) return;
    const tabPl = tabDefaultsRef.current.pipeline;
    const match = tabPl && pipes.some((p) => p.value === tabPl);
    setValue('pipeline', match ? tabPl : pipes[0].value);
  }, [open, leadOptions.pipelines, getValues, setValue]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const syncStagesForPipeline = () => {
      if (cancelled) return;
      // Defer past sibling effects so `setValue('pipeline', …)` from the preset effect is visible to `getValues`.
      const pv = String(getValues('pipeline') ?? '').trim();
      if (prevPipelineSyncRef.current === pv) return;
      prevPipelineSyncRef.current = pv;
      if (!pv) {
        setPipelineScopedStages(null);
        setValue('lifecycle_stage', '');
        setValue('life_cycle_stage_status', '');
        return;
      }
      getCrmStages(pv)
        .then((data) => {
          if (cancelled) return;
          const stages = Array.isArray(data.stages) ? data.stages : [];
          const { pipeline: tabPl, stage: tabSt } = tabDefaultsRef.current;
          const tabPlNorm = String(tabPl || '').trim();
          const pvNorm = String(pv || '').trim();
          const pipelineMatchesTab = Boolean(tabPlNorm && pvNorm === tabPlNorm);
          const tabStNorm = String(tabSt || '').trim();
          let chosen = stages[0];
          if (pipelineMatchesTab && tabStNorm) {
            let found = stages.find((s) => String(s.value ?? '').trim() === tabStNorm);
            if (!found) {
              const lower = tabStNorm.toLowerCase();
              found = stages.find(
                (s) =>
                  String(s.label ?? '')
                    .trim()
                    .toLowerCase() === lower,
              );
            }
            if (found) chosen = found;
          }
          // Flush stage options before setting field value so Radix Select can resolve the label (not placeholder).
          flushSync(() => {
            setPipelineScopedStages(data);
          });
          if (chosen) {
            setValue('lifecycle_stage', chosen.value);
            const sts = data.stageStatusMap?.[chosen.value] ?? [];
            setValue('life_cycle_stage_status', sts[0]?.value ?? '');
          } else {
            setValue('lifecycle_stage', '');
            setValue('life_cycle_stage_status', '');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPipelineScopedStages(null);
            setValue('lifecycle_stage', '');
            setValue('life_cycle_stage_status', '');
          }
        });
    };

    queueMicrotask(syncStagesForPipeline);
    return () => {
      cancelled = true;
    };
  }, [open, watchedPipeline, getValues, setValue, leadOptions.pipelines]);

  useEffect(() => {
    if (open && useFixedAccount) {
      setValue('associate_account', String(fixedAccount).trim());
    }
  }, [open, useFixedAccount, fixedAccount, setValue]);

  useEffect(() => {
    if (open && useFixedContact) {
      setValue('associate_contact', String(fixedContact).trim());
    }
  }, [open, useFixedContact, fixedContact, setValue]);

  useEffect(() => {
    if (!open || !fromCpAccount) return;
    setValue('cp_account', String(defaultCpAccountId || '').trim());
    setValue('cp_contact', String(defaultCpContactId || '').trim());
  }, [open, fromCpAccount, defaultCpAccountId, defaultCpContactId, setValue]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCpAccountOptions()
      .then((list) => {
        if (!cancelled) setFetchedCpAccountOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setFetchedCpAccountOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!createCpAccountModal.open) return;
    let cancelled = false;
    getCpAccountTypeOptions()
      .then((result) => {
        if (cancelled) return;
        setCpAccountTypeOptions(Array.isArray(result?.data) ? result.data : []);
      })
      .catch(() => {
        if (!cancelled) setCpAccountTypeOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [createCpAccountModal.open]);

  useEffect(() => {
    if (!open || lockCpContact) return;
    let cancelled = false;
    const cp = String(watchedCpAccount || '').trim();
    const load = cp ? getCpContactsForCpAccount(cp) : getCpContactLinkOptions();
    load
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list : [];
        setFetchedCpContactOptions(mapped);
        const cur = getValues('cp_contact');
        if (cur && !mapped.some((o) => o.value === cur)) {
          setValue('cp_contact', '');
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedCpContactOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, watchedCpAccount, lockCpContact, getValues, setValue]);

  useEffect(() => {
    if (!open) return;
    const hasProp = Object.keys(leadOptionsProp).length > 0;
    const fetchOptions = hasProp ? null : getCrmLeadOptions();
    const fetchSalesOwner = hasProp ? null : getSalesOwnerList();
    const fetchInsideSales = hasProp ? null : getInsideSalesList();
    Promise.all([
      getCrmAccountList(),
      getCrmContactList(),
      fetchOptions,
      fetchSalesOwner,
      fetchInsideSales,
    ]).then(([accounts, contacts, options, salesOwner, insideSales]) => {
      setAccountOptions(Array.isArray(accounts) ? accounts : []);
      const allContacts = Array.isArray(contacts) ? contacts : [];
      allContactsRef.current = allContacts;
      setContactOptions(allContacts);
      if (options && typeof options === 'object') {
        const merged = {
          ...options,
          sales_owner: Array.isArray(salesOwner) ? salesOwner : [],
          inside_sales: Array.isArray(insideSales) ? insideSales : [],
        };
        setFetchedLeadOptions(merged);
      }
    });
  }, [open, leadOptionsProp]);

  useEffect(() => {
    if (!open) return;
    const val = (watchedLeadOf || '').trim();
    let cancelled = false;

    getCrmLeadOptions(undefined, undefined, val)
      .then((opts) => {
        if (cancelled || !opts) return;
        setFetchedLeadOptions((prev) => ({
          ...prev,
          pipelines: Array.isArray(opts.pipelines) ? opts.pipelines : prev.pipelines || [],
          ...(opts.product?.length > 0 ? { product: opts.product } : {}),
        }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, watchedLeadOf]);

  useEffect(() => {
    if (!associateAccount || !associateAccount.trim()) {
      setContactOptions(allContactsRef.current);
      setAccountTabFields(ACCOUNT_TAB_DEFAULTS);
      setAccountTabSelectOptions(ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
      return;
    }

    let cancelled = false;

    Promise.all([getCrmAccount(associateAccount), getCrmAccountContacts(associateAccount)])
      .then(([account, contacts]) => {
        if (cancelled) return;

        const mappedContacts = (contacts || []).map((c) => ({
          value: c.name || c.value,
          label: c.full_name || c.label || c.name || c.value || '—',
        }));
        setContactOptions(mappedContacts);
        const currentContact = getValues('associate_contact');
        if (currentContact && !mappedContacts.some((o) => o.value === currentContact)) {
          setValue('associate_contact', '');
        }

        if (!account) {
          setAccountTabFields(ACCOUNT_TAB_DEFAULTS);
          setAccountTabSelectOptions(ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
          return;
        }

        const mapped = mapCrmAccountToTabFields(account, contacts);
        const salesOwnerFromLeadOptions = (leadOptions.sales_owner || []).find(
          (o) => o.value === mapped.fields.sales_owner,
        );
        if (salesOwnerFromLeadOptions) {
          mapped.options.sales_owner = [salesOwnerFromLeadOptions];
        }
        setAccountTabFields(mapped.fields);
        setAccountTabSelectOptions(mapped.options);
      })
      .catch(() => {
        if (cancelled) return;
        setContactOptions([]);
        setAccountTabFields(ACCOUNT_TAB_DEFAULTS);
        setAccountTabSelectOptions(ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
      });

    return () => {
      cancelled = true;
    };
  }, [associateAccount, getValues, setValue, leadOptions.sales_owner]);

  useEffect(() => {
    if (!associateContact || !associateContact.trim()) {
      setContactTabFields(CONTACT_TAB_DEFAULTS);
      setContactTabSelectOptions(CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
      return;
    }

    let cancelled = false;

    getCrmContact(associateContact)
      .then((contact) => {
        if (cancelled) return;
        if (!contact) {
          setContactTabFields(CONTACT_TAB_DEFAULTS);
          setContactTabSelectOptions(CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
          return;
        }

        const mapped = mapCrmContactToTabFields(contact);
        const salesOwnerFromLeadOptions = (leadOptions.sales_owner || []).find(
          (o) => o.value === mapped.fields.sales_owner,
        );
        if (salesOwnerFromLeadOptions) {
          mapped.options.sales_owner = [salesOwnerFromLeadOptions];
        }
        const accountFromOptions = accountOptions.find(
          (o) => o.value === mapped.fields.associate_account,
        );
        if (accountFromOptions) {
          mapped.options.associate_account = [accountFromOptions];
        }
        setContactTabFields(mapped.fields);
        setContactTabSelectOptions(mapped.options);
      })
      .catch(() => {
        if (cancelled) return;
        setContactTabFields(CONTACT_TAB_DEFAULTS);
        setContactTabSelectOptions(CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
      });

    return () => {
      cancelled = true;
    };
  }, [associateContact, leadOptions.sales_owner, accountOptions]);

  useEffect(() => {
    if (!watchedCpAccount || !String(watchedCpAccount).trim()) {
      setCpAccountTabFields(CP_ACCOUNT_TAB_DEFAULTS);
      setCpAccountTabSelectOptions(CP_ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
      return;
    }

    let cancelled = false;

    getCpAccountById(watchedCpAccount)
      .then((res) => {
        if (cancelled) return;
        if (res?.error || !res?.data) {
          setCpAccountTabFields(CP_ACCOUNT_TAB_DEFAULTS);
          setCpAccountTabSelectOptions(CP_ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
          showErrorToast(res?.error || 'Failed to load CP Account details');
          return;
        }
        const mapped = mapCpAccountToTabFields(res.data);
        setCpAccountTabFields(mapped.fields);
        setCpAccountTabSelectOptions(mapped.options);
      })
      .catch(() => {
        if (cancelled) return;
        setCpAccountTabFields(CP_ACCOUNT_TAB_DEFAULTS);
        setCpAccountTabSelectOptions(CP_ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
        showErrorToast('Failed to load CP Account details');
      });

    return () => {
      cancelled = true;
    };
  }, [watchedCpAccount]);

  useEffect(() => {
    if (!watchedCpContact || !String(watchedCpContact).trim()) {
      setCpContactTabFields(CP_CONTACT_TAB_DEFAULTS);
      setCpContactTabSelectOptions(CP_CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
      return;
    }

    let cancelled = false;

    getCpContactById(watchedCpContact)
      .then((res) => {
        if (cancelled) return;
        if (res?.error || !res?.data) {
          setCpContactTabFields(CP_CONTACT_TAB_DEFAULTS);
          setCpContactTabSelectOptions(CP_CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
          showErrorToast(res?.error || 'Failed to load CP Contact details');
          return;
        }
        const mapped = mapCpContactToTabFields(res.data);
        const salesOwnerFromLeadOptions = (leadOptions.sales_owner || []).find(
          (o) => o.value === mapped.fields.sales_owner,
        );
        if (salesOwnerFromLeadOptions) {
          mapped.options.sales_owner = [salesOwnerFromLeadOptions];
        }
        const cpAccountFromOptions = (
          fetchedCpAccountOptions.length > 0 ? fetchedCpAccountOptions : []
        ).find((o) => o.value === mapped.fields.associate_cp_account);
        if (cpAccountFromOptions) {
          mapped.options.associate_cp_account = [cpAccountFromOptions];
        }
        if (mapped.fields.reporting_manager && mapped.options.reporting_manager.length === 0) {
          mapped.options.reporting_manager = [
            {
              value: mapped.fields.reporting_manager,
              label: mapped.fields.reporting_manager,
            },
          ];
        }
        setCpContactTabFields(mapped.fields);
        setCpContactTabSelectOptions(mapped.options);
      })
      .catch(() => {
        if (cancelled) return;
        setCpContactTabFields(CP_CONTACT_TAB_DEFAULTS);
        setCpContactTabSelectOptions(CP_CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
        showErrorToast('Failed to load CP Contact details');
      });

    return () => {
      cancelled = true;
    };
  }, [watchedCpContact, leadOptions.sales_owner, fetchedCpAccountOptions]);

  const handleClose = () => {
    reset(defaultValues);
    setAccountTabFields(ACCOUNT_TAB_DEFAULTS);
    setAccountTabSelectOptions(ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
    setContactTabFields(CONTACT_TAB_DEFAULTS);
    setContactTabSelectOptions(CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
    setCpAccountTabFields(CP_ACCOUNT_TAB_DEFAULTS);
    setCpAccountTabSelectOptions(CP_ACCOUNT_TAB_SELECT_OPTIONS_DEFAULTS);
    setCpContactTabFields(CP_CONTACT_TAB_DEFAULTS);
    setCpContactTabSelectOptions(CP_CONTACT_TAB_SELECT_OPTIONS_DEFAULTS);
    setTagInput('');
    setPrimaryLeadModal({ open: false, existingLeadName: '', pendingData: null });
    setCreateContactModal({
      open: false,
      first_name: '',
      last_name: '',
      email: '',
      mobile_number: '',
    });
    setCreateContactErrors({});
    setIsCreatingContact(false);
    setCreateCpAccountModal({
      open: false,
      name: '',
      brand_name: '',
      type: '',
    });
    setCreateCpAccountErrors({});
    setIsCreatingCpAccount(false);
    setCreateCpContactModal({
      open: false,
      first_name: '',
      last_name: '',
    });
    setCreateCpContactErrors({});
    setIsCreatingCpContact(false);
    onOpenChange?.(false);
  };

  const setAccountTabField = (key, value) => {
    setAccountTabFields((prev) => ({ ...prev, [key]: value }));
  };

  const setContactTabField = (key, value) => {
    setContactTabFields((prev) => ({ ...prev, [key]: value }));
  };

  const setCpAccountTabField = (key, value) => {
    setCpAccountTabFields((prev) => ({ ...prev, [key]: value }));
  };

  const setCpContactTabField = (key, value) => {
    setCpContactTabFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateAssociateAccount = async (searchQuery, close) => {
    const accountName = String(searchQuery || '').trim();
    if (!accountName || creatingAccountRef.current) return;

    creatingAccountRef.current = true;
    setIsCreatingAccount(true);
    try {
      const formValues = getValues();
      const account = await createCrmAccount({
        customer_name: accountName,
        custom_legal_name: '',
        customer_group: '',
        industry: '',
        website: '',
        sales_owner: String(formValues?.sales_owner || '').trim(),
        custom_year_of_establishment: null,
        number_of_employees: null,
        parent_company: '',
        associate_company: '',
        cp_account: String(
          formValues?.cp_account ?? (lockCpAccount ? defaultCpAccountId : '') ?? '',
        ).trim(),
        cp_contact: String(
          formValues?.cp_contact ?? (lockCpContact ? defaultCpContactId : '') ?? '',
        ).trim(),
        custom_status: 'Active',
        customer_type: 'Company',
        custom_addresses: [],
        social_links: [],
      });
      const accountId =
        typeof account === 'string'
          ? account
          : String(account?.name || account?.value || '').trim();
      if (!accountId) throw new Error('Account ID was not returned');

      const createdOption = { value: accountId, label: accountName };
      setAccountOptions((previous) =>
        previous.some((option) => String(option?.value) === String(accountId))
          ? previous
          : [...previous, createdOption],
      );
      setValue('associate_account', accountId, { shouldDirty: true, shouldValidate: true });
      close?.();
      showSuccessToast('Account created successfully');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create account' });
    } finally {
      // eslint-disable-next-line require-atomic-updates -- create mutex reset
      creatingAccountRef.current = false;
      setIsCreatingAccount(false);
    }
  };

  const openCreateContactModal = (searchQuery, close) => {
    const firstName = String(searchQuery || '').trim();
    if (!firstName) return;
    close?.();
    setCreateContactErrors({});
    setCreateContactModal({
      open: true,
      first_name: firstName,
      last_name: '',
      email: '',
      mobile_number: '',
    });
  };

  const closeCreateContactModal = () => {
    if (isCreatingContact) return;
    setCreateContactModal({
      open: false,
      first_name: '',
      last_name: '',
      email: '',
      mobile_number: '',
    });
    setCreateContactErrors({});
  };

  const setCreateContactField = (key, value) => {
    setCreateContactModal((prev) => ({ ...prev, [key]: value }));
    setCreateContactErrors((prev) => {
      if (!prev?.[key] && !prev?.contact) return prev;
      const next = { ...prev };
      delete next[key];
      if (key === 'email' || key === 'mobile_number') delete next.contact;
      return next;
    });
  };

  const handleSubmitCreateContact = async () => {
    const firstName = String(createContactModal.first_name || '').trim();
    const lastName = String(createContactModal.last_name || '').trim();
    const email = String(createContactModal.email || '').trim();
    const mobileNumber = String(createContactModal.mobile_number || '').trim();
    const phoneDigits = mobileNumber.includes('-')
      ? mobileNumber.split('-').slice(1).join('').replaceAll(/\D/g, '')
      : mobileNumber.replaceAll(/\D/g, '');
    const hasPhone = phoneDigits.length > 0;
    const nextErrors = {};

    if (!firstName) nextErrors.first_name = 'First Name is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Invalid email address';
    }
    if (!email && !hasPhone) {
      nextErrors.contact = 'Email or phone number is required';
    }

    setCreateContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || creatingContactRef.current) return;

    creatingContactRef.current = true;
    setIsCreatingContact(true);
    try {
      const formValues = getValues();
      const accountValue = useFixedAccount
        ? String(fixedAccount || '').trim()
        : String(formValues?.associate_account || '').trim();
      const result = await createCrmContact({
        first_name: firstName,
        last_name: lastName,
        email: email || undefined,
        mobile_number: hasPhone ? mobileNumber : undefined,
        associate_account: accountValue || undefined,
        cp_account:
          String(
            formValues?.cp_account ?? (lockCpAccount ? defaultCpAccountId : '') ?? '',
          ).trim() || undefined,
        cp_contact:
          String(
            formValues?.cp_contact ?? (lockCpContact ? defaultCpContactId : '') ?? '',
          ).trim() || undefined,
        sales_owner: String(formValues?.sales_owner || '').trim() || undefined,
      });
      const contactId =
        typeof result === 'string' ? result : String(result?.name || result?.value || '').trim();
      if (!contactId) throw new Error('Contact ID was not returned');

      const label = [firstName, lastName].filter(Boolean).join(' ') || contactId;
      const createdOption = { value: contactId, label };
      setContactOptions((previous) =>
        previous.some((option) => String(option?.value) === String(contactId))
          ? previous
          : [...previous, createdOption],
      );
      allContactsRef.current = [
        ...allContactsRef.current.filter((o) => String(o?.value) !== String(contactId)),
        createdOption,
      ];
      setValue('associate_contact', contactId, { shouldDirty: true, shouldValidate: true });
      setCreateContactModal({
        open: false,
        first_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
      });
      setCreateContactErrors({});
      showSuccessToast('Contact created successfully');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create contact' });
    } finally {
      // eslint-disable-next-line require-atomic-updates -- create mutex reset
      creatingContactRef.current = false;
      setIsCreatingContact(false);
    }
  };

  const openCreateCpAccountModal = (searchQuery, close) => {
    const name = String(searchQuery || '').trim();
    if (!name) return;
    close?.();
    setCreateCpAccountErrors({});
    setCreateCpAccountModal({
      open: true,
      name,
      brand_name: '',
      type: '',
    });
  };

  const closeCreateCpAccountModal = () => {
    if (isCreatingCpAccount) return;
    setCreateCpAccountModal({
      open: false,
      name: '',
      brand_name: '',
      type: '',
    });
    setCreateCpAccountErrors({});
  };

  const setCreateCpAccountField = (key, value) => {
    setCreateCpAccountModal((prev) => ({ ...prev, [key]: value }));
    setCreateCpAccountErrors((prev) => {
      if (!prev?.[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmitCreateCpAccount = async () => {
    const name = String(createCpAccountModal.name || '').trim();
    const brandName = String(createCpAccountModal.brand_name || '').trim();
    const type = String(createCpAccountModal.type || '').trim();
    const nextErrors = {};

    if (!name) nextErrors.name = 'Name is required';
    if (!brandName) nextErrors.brand_name = 'Brand Name is required';
    if (!type) nextErrors.type = 'Type is required';

    setCreateCpAccountErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || creatingCpAccountRef.current) return;

    const selectedCenter =
      Array.isArray(centerAccess?.selectedCenters) && centerAccess.selectedCenters.length > 0
        ? centerAccess.selectedCenters[0]
        : undefined;
    if (!selectedCenter) {
      showErrorToast('Please select at least one center from the toolbar.');
      return;
    }

    creatingCpAccountRef.current = true;
    setIsCreatingCpAccount(true);
    try {
      const result = await createCpAccount({
        center: selectedCenter,
        type,
        legalName: name,
        brandName,
      });
      if (result?.error) throw new Error(result.error);

      const data = result?.data;
      const accountId =
        typeof data === 'string'
          ? data
          : String(data?.name || data?.data?.name || data?.id || '').trim();
      if (!accountId) throw new Error('CP Account ID was not returned');

      const label = name;
      const createdOption = { value: accountId, label };
      setFetchedCpAccountOptions((previous) =>
        previous.some((option) => String(option?.value) === String(accountId))
          ? previous
          : [...previous, createdOption],
      );
      setValue('cp_account', accountId, { shouldDirty: true, shouldValidate: true });
      setCreateCpAccountModal({
        open: false,
        name: '',
        brand_name: '',
        type: '',
      });
      setCreateCpAccountErrors({});
      showSuccessToast('CP Account created successfully');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create CP account' });
    } finally {
      // eslint-disable-next-line require-atomic-updates -- create mutex reset
      creatingCpAccountRef.current = false;
      setIsCreatingCpAccount(false);
    }
  };

  const openCreateCpContactModal = (searchQuery, close) => {
    const firstName = String(searchQuery || '').trim();
    if (!firstName) return;
    close?.();
    setCreateCpContactErrors({});
    setCreateCpContactModal({
      open: true,
      first_name: firstName,
      last_name: '',
    });
  };

  const closeCreateCpContactModal = () => {
    if (isCreatingCpContact) return;
    setCreateCpContactModal({
      open: false,
      first_name: '',
      last_name: '',
    });
    setCreateCpContactErrors({});
  };

  const setCreateCpContactField = (key, value) => {
    setCreateCpContactModal((prev) => ({ ...prev, [key]: value }));
    setCreateCpContactErrors((prev) => {
      if (!prev?.[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmitCreateCpContact = async () => {
    const firstName = String(createCpContactModal.first_name || '').trim();
    const lastName = String(createCpContactModal.last_name || '').trim();
    const nextErrors = {};

    if (!firstName) nextErrors.first_name = 'First Name is required';
    if (!lastName) nextErrors.last_name = 'Last Name is required';

    const formValues = getValues();
    const cpAccountId = String(
      formValues?.cp_account ?? (lockCpAccount ? defaultCpAccountId : '') ?? '',
    ).trim();
    if (!cpAccountId) {
      nextErrors.cp_account = 'CP Account is required';
      showErrorToast('Please select a CP Account before creating a CP Contact');
    }

    setCreateCpContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || creatingCpContactRef.current) return;

    creatingCpContactRef.current = true;
    setIsCreatingCpContact(true);
    try {
      const result = await createCpContact({
        firstName,
        lastName,
        email: '',
        cpAccountId,
      });
      if (result?.error) throw new Error(result.error);

      const data = result?.data;
      const contactId =
        typeof data === 'string'
          ? data
          : String(data?.name || data?.data?.name || data?.id || '').trim();
      if (!contactId) throw new Error('CP Contact ID was not returned');

      const label = [firstName, lastName].filter(Boolean).join(' ') || contactId;
      const createdOption = { value: contactId, label };
      setFetchedCpContactOptions((previous) =>
        previous.some((option) => String(option?.value) === String(contactId))
          ? previous
          : [...previous, createdOption],
      );
      setValue('cp_contact', contactId, { shouldDirty: true, shouldValidate: true });
      setCreateCpContactModal({
        open: false,
        first_name: '',
        last_name: '',
      });
      setCreateCpContactErrors({});
      showSuccessToast('CP Contact created successfully');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create CP contact' });
    } finally {
      // eslint-disable-next-line require-atomic-updates -- create mutex reset
      creatingCpContactRef.current = false;
      setIsCreatingCpContact(false);
    }
  };

  const commitTagInput = () => {
    if (!tagInput.trim()) return;
    const next = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !tagArray.includes(t));
    if (next.length > 0) setValue('tags', [...tagArray, ...next]);
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitTagInput();
  };

  const removeTag = (tagToRemove) => {
    setValue(
      'tags',
      tagArray.filter((t) => t !== tagToRemove),
    );
  };

  const buildPayload = (data, isPrimary) => {
    const accountValue = useFixedAccount
      ? String(fixedAccount || '').trim()
      : (data.associate_account || '').trim();
    const contactValue = useFixedContact
      ? String(fixedContact || '').trim()
      : (data.associate_contact || '').trim();
    // RHF omits disabled fields from submit; merge CP defaults when locked.
    const cpAccountPayload = String(
      data.cp_account ?? (lockCpAccount ? defaultCpAccountId : '') ?? '',
    ).trim();
    const cpContactPayload = String(
      data.cp_contact ?? (lockCpContact ? defaultCpContactId : '') ?? '',
    ).trim();
    const rawSeats = data.no_of_seats;
    const seatsTrimmed = rawSeats === undefined || rawSeats === null ? '' : String(rawSeats).trim();
    const noOfSeatsParsed = seatsTrimmed === '' ? undefined : Number.parseInt(seatsTrimmed, 10);
    const noOfSeatsPayload =
      noOfSeatsParsed !== undefined && !Number.isNaN(noOfSeatsParsed) ? noOfSeatsParsed : undefined;
    return {
      lead_name: data.lead_name?.trim() || '',
      lead_of: data.lead_of || '',
      account: accountValue,
      contact: contactValue,
      cp_account: cpAccountPayload,
      cp_contact: cpContactPayload,
      is_primary: Boolean(isPrimary),
      city: data.city || '',
      est_monthly_value: data.est_monthly_value || '',
      est_lifetime_value: data.est_lifetime_value || '',
      pipeline: (data.pipeline || '').trim(),
      lifecycle_stage: data.lifecycle_stage || '',
      life_cycle_stage_status: data.life_cycle_stage_status || '',
      lead_temperature: data.lead_temperature || 'Hot',
      lost_reason: data.lost_reason || '',
      sales_owner: data.sales_owner || '',
      inside_sales: data.inside_sales || '',
      lead_relevance: data.lead_relevance || '',
      need_urgency: data.need_urgency || '',
      info_call_status: data.info_call_status || '',
      lead_size: data.lead_size || '',
      ...(noOfSeatsPayload === undefined ? {} : { no_of_seats: noOfSeatsPayload }),
      product: data.product || '',
      external_id: data.external_id || '',
      service_id: data.service_id || '',
      service_name: data.service_name || '',
      lead_source: data.lead_source || '',
      campaign: data.campaign || '',
      source: data.source || '',
      medium: data.medium || '',
      term: data.term || '',
      content: data.content || '',
      tags: JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
      gclid: data.gclid || '',
      ad_group: data.ad_group || '',
      landing_page_url: data.landing_page_url || '',
      contact_from_url: data.contact_from_url || '',
      contact_message: data.message || '',
      delacon_info_date: data.delacon_info_date || '',
      delacon_info_termination_point: data.delacon_info_termination_point || '',
      delacon_info_call_status: data.delacon_info_call_status || '',
      delacon_web_info_search_engine: data.delacon_web_info_search_engine || '',
      delacon_web_info_search_type: data.delacon_web_info_search_type || '',
      delacon_city: data.delacon_city || '',
      delacon_adwords_info_conversions: data.delacon_adwords_info_conversions || '',
      delacon_adwords_info_cpc: data.delacon_adwords_info_cpc || '',
      delacon_adwords_info_cost: data.delacon_adwords_info_cost || '',
      delacon_info_caller: data.delacon_info_caller || '',
      delacon_adwords_info_clicks: data.delacon_adwords_info_clicks || '',
      delacon_call_recording: data.delacon_call_recording || '',
      delacon_landing_page: data.delacon_landing_page || '',
      delacon_web_info_page_called_from: data.delacon_web_info_page_called_from || '',
      delacon_inside_sales_fr_tat: data.delacon_inside_sales_fr_tat || '',
      delacon_sales_fr_tat: data.delacon_sales_fr_tat || '',
    };
  };

  const doSubmit = async (data, isPrimary) => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload(data, isPrimary);
      const result = await createCrmLead(payload);
      const name = typeof result === 'object' ? result?.name : result;
      showSuccessToast('Lead created successfully');
      setPrimaryLeadModal({ open: false, existingLeadName: '', pendingData: null });
      await onSuccess?.(name ? { name } : result);
      handleClose();
    } catch (error) {
      const message =
        error?.response?.data?.exception ||
        error?.response?.data?.message ||
        'Failed to create lead';
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data) => {
    const statusLower = data.life_cycle_stage_status
      ? String(data.life_cycle_stage_status).toLowerCase().trim()
      : '';
    const requiresLostReason = Boolean(
      statusLower && (statusLower.includes('lost') || statusLower.includes('drop')),
    );
    if (requiresLostReason && !(data.lost_reason || '').trim()) {
      showErrorToast('Lost Reason is required');
      return;
    }
    const cpContactForValidation = String(
      data.cp_contact ?? (lockCpContact ? defaultCpContactId : '') ?? '',
    ).trim();
    if ((fromCpAccount || lockCpContact) && !cpContactForValidation) {
      showErrorToast('CP Contact is required');
      return;
    }
    const contactId = useFixedContact
      ? String(fixedContact || '').trim()
      : (data.associate_contact || '').trim();
    if (contactId) {
      try {
        const primary = await getPrimaryLeadForContact(contactId);
        if (primary.has_primary_lead) {
          setPrimaryLeadModal({
            open: true,
            existingLeadName: primary.lead_display_name || primary.lead_name || 'Existing lead',
            pendingData: data,
          });
          return;
        }
      } catch {
        // If check fails, proceed with create (new lead will not be forced primary)
      }
    }
    await doSubmit(data, true);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content
        className={`flex flex-col h-full ${showMoreFields ? 'max-w-[900px] w-[900px] overflow-hidden' : 'max-w-[640px] w-[640px]'}`}
      >
        <Drawer.Header className='px-6 py-4 shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-500'>
              <RiMoneyDollarCircleLine size={20} />
            </div>
            <div>
              <Drawer.Title>Add New Lead</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-600 mt-0.5'>
                Enter below details to add new lead.
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form
          id='lead-create-form'
          onSubmit={handleSubmit(onSubmit)}
          className='flex flex-1 flex-col min-h-0 overflow-hidden'
        >
          <Drawer.Body className='flex-1 flex flex-col min-h-0 overflow-hidden'>
            <TabMenuVertical.Root
              value={activeTab}
              onValueChange={setActiveTab}
              className='flex h-full w-full min-h-0'
            >
              {showMoreFields && (
                <div className='relative shrink-0 w-[240px] h-full bg-bg-weak-100 border-r border-stroke-soft-200'>
                  <TabMenuVertical.List className='p-4 w-full gap-2 flex flex-col'>
                    {TABS.map((tab) => (
                      <TabMenuVertical.Trigger
                        key={tab.id}
                        value={tab.id}
                        className='w-full flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                      >
                        <TabMenuVertical.Icon as={tab.icon} />
                        <span className='truncate flex-1 min-w-0'>{tab.label}</span>
                        <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                      </TabMenuVertical.Trigger>
                    ))}
                  </TabMenuVertical.List>
                </div>
              )}
              <div className='flex-1 min-h-0 overflow-y-auto px-6 pb-6'>
                {(!showMoreFields || activeTab === 'basic') && (
                  <>
                    <SectionTitle icon={<RiInformationFill size={16} />}>
                      Basic Information
                    </SectionTitle>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                      <div className='col-span-2 flex flex-col'>
                        <FieldLabel required>Lead Name</FieldLabel>
                        <Controller
                          name='lead_name'
                          control={control}
                          render={({ field }) => (
                            <Input.Root hasError={Boolean(errors.lead_name)}>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter lead name' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {errors.lead_name && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {errors.lead_name.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='col-span-2 flex flex-col'>
                        <FieldLabel>Lead Of</FieldLabel>
                        <Controller
                          name='lead_of'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              disabled={Boolean(associateAccount)}
                              value={field.value}
                              onValueChange={(val) => {
                                field.onChange(val);
                              }}
                              options={leadOptions.lead_of || []}
                              placeholder='Select Lead Of'
                              searchPlaceholder='Search lead of...'
                              noResultsMessage='No options found'
                              emptyMessage='No options available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>

                      <>
                        <div className='flex flex-col'>
                          <FieldLabel required={lockCpAccount || fromCpAccount}>
                            CP Account
                          </FieldLabel>
                          <Controller
                            name='cp_account'
                            control={control}
                            render={({ field }) =>
                              lockCpAccount ? (
                                <Select.Root
                                  value={field.value || undefined}
                                  onValueChange={field.onChange}
                                  disabled
                                >
                                  <Select.Trigger>
                                    <Select.Value placeholder='Select' />
                                  </Select.Trigger>
                                  <Select.Content>
                                    <Select.Item
                                      key={defaultCpAccountId}
                                      value={defaultCpAccountId}
                                    >
                                      {defaultCpAccountLabel || defaultCpAccountId}
                                    </Select.Item>
                                  </Select.Content>
                                </Select.Root>
                              ) : (
                                <SearchableSelect
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  options={cpAccountOptionsForSelect}
                                  placeholder='Select CP account'
                                  searchPlaceholder='Search CP account...'
                                  noResultsMessage='No accounts found'
                                  emptyMessage='No accounts available'
                                  isolateSearchKeyboard
                                  renderFooter={({ close, searchQuery }) => {
                                    const normalizedQuery = String(searchQuery || '')
                                      .trim()
                                      .toLocaleLowerCase();
                                    const accountAlreadyExists = cpAccountOptionsForSelect.some(
                                      (option) => {
                                        const label = String(option?.label || '')
                                          .trim()
                                          .toLocaleLowerCase();
                                        const value = String(option?.value || '')
                                          .trim()
                                          .toLocaleLowerCase();
                                        return (
                                          label === normalizedQuery || value === normalizedQuery
                                        );
                                      },
                                    );
                                    if (!normalizedQuery || accountAlreadyExists) return null;
                                    return (
                                      <button
                                        type='button'
                                        className='flex w-full items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm font-medium text-primary-base hover:bg-bg-weak-50'
                                        onClick={() => openCreateCpAccountModal(searchQuery, close)}
                                      >
                                        <RiAddLine size={18} />
                                        Create new CP account
                                      </button>
                                    );
                                  }}
                                />
                              )
                            }
                          />
                        </div>
                        <div className='flex flex-col'>
                          <FieldLabel required={lockCpContact || fromCpAccount}>
                            CP Contact
                          </FieldLabel>
                          <Controller
                            name='cp_contact'
                            control={control}
                            render={({ field }) => {
                              if (lockCpContact) {
                                return (
                                  <Select.Root
                                    value={field.value || undefined}
                                    onValueChange={field.onChange}
                                    disabled
                                  >
                                    <Select.Trigger>
                                      <Select.Value placeholder='Select' />
                                    </Select.Trigger>
                                    <Select.Content>
                                      {effectiveCpContactSelectOptions.length === 0
                                        ? null
                                        : effectiveCpContactSelectOptions.map((opt) => (
                                            <Select.Item key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </Select.Item>
                                          ))}
                                    </Select.Content>
                                  </Select.Root>
                                );
                              }

                              return (
                                <SearchableSelect
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  options={effectiveCpContactSelectOptions}
                                  placeholder='Select'
                                  searchPlaceholder='Search CP contact...'
                                  noResultsMessage='No contacts found'
                                  emptyMessage='No contacts available'
                                  isolateSearchKeyboard
                                  renderFooter={({ close, searchQuery }) => {
                                    const normalizedQuery = String(searchQuery || '')
                                      .trim()
                                      .toLocaleLowerCase();
                                    const contactAlreadyExists =
                                      effectiveCpContactSelectOptions.some((option) => {
                                        const label = String(option?.label || '')
                                          .trim()
                                          .toLocaleLowerCase();
                                        const value = String(option?.value || '')
                                          .trim()
                                          .toLocaleLowerCase();
                                        return (
                                          label === normalizedQuery || value === normalizedQuery
                                        );
                                      });
                                    if (!normalizedQuery || contactAlreadyExists) return null;
                                    return (
                                      <button
                                        type='button'
                                        className='flex w-full items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm font-medium text-primary-base hover:bg-bg-weak-50'
                                        onClick={() => openCreateCpContactModal(searchQuery, close)}
                                      >
                                        <RiAddLine size={18} />
                                        Create new CP contact
                                      </button>
                                    );
                                  }}
                                />
                              );
                            }}
                          />
                        </div>
                      </>

                      {!useFixedAccount && (
                        <div className='flex flex-col'>
                          <FieldLabel>Account Name</FieldLabel>
                          <Controller
                            name='associate_account'
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                value={field.value}
                                onValueChange={field.onChange}
                                options={accountOptions}
                                placeholder='Select'
                                searchPlaceholder='Search account...'
                                noResultsMessage='No accounts found'
                                emptyMessage='No accounts available'
                                isolateSearchKeyboard
                                renderFooter={({ close, searchQuery }) => {
                                  const normalizedQuery = String(searchQuery || '')
                                    .trim()
                                    .toLocaleLowerCase();
                                  const accountAlreadyExists = accountOptions.some((option) => {
                                    const label = String(option?.label || '')
                                      .trim()
                                      .toLocaleLowerCase();
                                    const value = String(option?.value || '')
                                      .trim()
                                      .toLocaleLowerCase();
                                    return label === normalizedQuery || value === normalizedQuery;
                                  });
                                  if (!normalizedQuery || accountAlreadyExists) return null;
                                  return (
                                    <button
                                      type='button'
                                      className='flex w-full items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm font-medium text-primary-base hover:bg-bg-weak-50 disabled:opacity-50'
                                      disabled={isCreatingAccount}
                                      onClick={() =>
                                        handleCreateAssociateAccount(searchQuery, close)
                                      }
                                    >
                                      <RiAddLine size={18} />
                                      {isCreatingAccount
                                        ? 'Creating account…'
                                        : `Create "${String(searchQuery || '').trim()}"`}
                                    </button>
                                  );
                                }}
                              />
                            )}
                          />
                        </div>
                      )}

                      {!useFixedContact && (
                        <div className='flex flex-col'>
                          <FieldLabel>Contact Name</FieldLabel>
                          <Controller
                            name='associate_contact'
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                value={field.value}
                                onValueChange={(v) => {
                                  field.onChange(v);
                                  if (!useFixedAccount && !associateAccount && v) {
                                    getCrmContact(v)
                                      .then((contactDocument) => {
                                        if (contactDocument?.account)
                                          setValue('associate_account', contactDocument.account);
                                      })
                                      .catch(() => {});
                                  }
                                }}
                                options={contactOptions}
                                placeholder='Select'
                                searchPlaceholder='Search contact...'
                                noResultsMessage='No contacts found'
                                emptyMessage='No contacts available'
                                isolateSearchKeyboard
                                renderFooter={({ close, searchQuery }) => {
                                  const normalizedQuery = String(searchQuery || '')
                                    .trim()
                                    .toLocaleLowerCase();
                                  const contactAlreadyExists = contactOptions.some((option) => {
                                    const label = String(option?.label || '')
                                      .trim()
                                      .toLocaleLowerCase();
                                    const value = String(option?.value || '')
                                      .trim()
                                      .toLocaleLowerCase();
                                    return label === normalizedQuery || value === normalizedQuery;
                                  });
                                  if (!normalizedQuery || contactAlreadyExists) return null;
                                  return (
                                    <button
                                      type='button'
                                      className='flex w-full items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm font-medium text-primary-base hover:bg-bg-weak-50'
                                      onClick={() => openCreateContactModal(searchQuery, close)}
                                    >
                                      <RiAddLine size={18} />
                                      Create new contact
                                    </button>
                                  );
                                }}
                              />
                            )}
                          />
                        </div>
                      )}

                      <div className='col-span-2 flex gap-4'>
                        <div className='flex-1 flex flex-col'>
                          <FieldLabel required>Pipeline</FieldLabel>
                          <Controller
                            name='pipeline'
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                value={field.value}
                                onValueChange={field.onChange}
                                options={leadOptions.pipelines || []}
                                placeholder='Select pipeline'
                                searchPlaceholder='Search pipeline...'
                                noResultsMessage='No pipelines found'
                                emptyMessage='No pipelines available'
                                isolateSearchKeyboard
                              />
                            )}
                          />
                          {errors.pipeline && (
                            <Hint.Root hasError className='mt-1'>
                              <Hint.Icon as={RiInformationFill} />
                              {errors.pipeline.message}
                            </Hint.Root>
                          )}
                        </div>
                        <div className='flex-1 flex flex-col'>
                          <FieldLabel required>Lifecycle Stage</FieldLabel>
                          <Controller
                            name='lifecycle_stage'
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                value={field.value}
                                onValueChange={field.onChange}
                                options={stageOptions}
                                placeholder={pipelineTrim ? 'Select' : 'Select pipeline first'}
                                searchPlaceholder='Search stage...'
                                noResultsMessage='No stages found'
                                emptyMessage='No stages available'
                                isolateSearchKeyboard
                              />
                            )}
                          />
                          {errors.lifecycle_stage && (
                            <Hint.Root hasError className='mt-1'>
                              <Hint.Icon as={RiInformationFill} />
                              {errors.lifecycle_stage.message}
                            </Hint.Root>
                          )}
                        </div>
                      </div>

                      <div className='flex-1 flex flex-col'>
                        <FieldLabel required>Lifecycle Stage Status</FieldLabel>
                        <Controller
                          name='life_cycle_stage_status'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={statusOptions}
                              placeholder={
                                pipelineTrim
                                  ? isStatusDisabled
                                    ? 'Select lifecycle stage first'
                                    : 'Select'
                                  : 'Select pipeline first'
                              }
                              searchPlaceholder='Search status...'
                              noResultsMessage='No statuses found'
                              emptyMessage='No statuses available'
                              disabled={isStatusDisabled}
                              isolateSearchKeyboard
                            />
                          )}
                        />
                        {errors.life_cycle_stage_status && (
                          <Hint.Root hasError className='mt-1'>
                            <Hint.Icon as={RiInformationFill} />
                            {errors.life_cycle_stage_status.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Lead Temperature</FieldLabel>
                        <Controller
                          name='lead_temperature'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value || 'Hot'}
                              onValueChange={field.onChange}
                              options={LEAD_TEMPERATURE_OPTIONS}
                              placeholder='Select'
                              searchPlaceholder='Search temperature...'
                              noResultsMessage='No options found'
                              emptyMessage='No options available'
                              isolateSearchKeyboard
                              renderTrigger={() => {
                                const temp = field.value || 'Hot';
                                const Icon = LEAD_TEMPERATURE_ICONS[temp];
                                const color = LEAD_TEMPERATURE_COLORS[temp];
                                return (
                                  <LeadTemperatureBadge
                                    value={temp}
                                    label={temp}
                                    icon={Icon}
                                    color={color}
                                  />
                                );
                              }}
                              renderOptionLabel={(opt) => {
                                const Icon = LEAD_TEMPERATURE_ICONS[opt.value];
                                const color = LEAD_TEMPERATURE_COLORS[opt.value];
                                return (
                                  <LeadTemperatureBadge
                                    value={opt.value}
                                    label={opt.label ?? opt.value}
                                    icon={Icon}
                                    color={color}
                                  />
                                );
                              }}
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Lead Size</FieldLabel>
                        <Controller
                          name='lead_size'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={[
                                { value: SELECT_NONE_VALUE, label: '—' },
                                ...(pipelineScopedLinkOptions.lead_size || []),
                              ]}
                              valueSentinel={SELECT_NONE_VALUE}
                              placeholder='Select'
                              searchPlaceholder='Search lead size...'
                              noResultsMessage='No lead sizes found'
                              emptyMessage='No lead sizes available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>No. of Seats</FieldLabel>
                        <Controller
                          name='no_of_seats'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter no. of seats' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Product</FieldLabel>
                        <Controller
                          name='product'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={leadOptions.product || []}
                              placeholder='Select'
                              searchPlaceholder='Search product...'
                              noResultsMessage='No products found'
                              emptyMessage='No products available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>City</FieldLabel>
                        <Controller
                          name='city'
                          control={control}
                          render={({ field }) => (
                            <CityCombobox
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder='Select'
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Est. Monthly Value</FieldLabel>
                        <Controller
                          name='est_monthly_value'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper className='relative'>
                                <span className='absolute left-0 top-1/2 -translate-y-1/2 text-text-sub-500 text-paragraph-sm select-none'>
                                  ₹
                                </span>
                                <Input.Input
                                  value={formatNumberInrForInput(field.value)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  onChange={(e) =>
                                    field.onChange(e.target.value.replaceAll(/[^\d.]/g, ''))
                                  }
                                  inputMode='decimal'
                                  placeholder='0'
                                  className='pl-2'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Est. Lifetime Value</FieldLabel>
                        <Controller
                          name='est_lifetime_value'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper className='relative'>
                                <span className='absolute left-0 top-1/2 -translate-y-1/2 text-text-sub-500 text-paragraph-sm select-none'>
                                  ₹
                                </span>
                                <Input.Input
                                  value={formatNumberInrForInput(field.value)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  onChange={(e) =>
                                    field.onChange(e.target.value.replaceAll(/[^\d.]/g, ''))
                                  }
                                  inputMode='decimal'
                                  placeholder='0'
                                  className='pl-2'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>

                      {showLostReason && (
                        <div className='flex flex-col'>
                          <FieldLabel required>Lost Reason</FieldLabel>
                          <Controller
                            name='lost_reason'
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                value={field.value}
                                onValueChange={field.onChange}
                                options={lostReasonSelectOptions}
                                placeholder='Select'
                                searchPlaceholder='Search reason...'
                                noResultsMessage='No reasons found'
                                emptyMessage='No reasons available'
                                isolateSearchKeyboard
                              />
                            )}
                          />
                        </div>
                      )}

                      <div className='flex flex-col'>
                        <FieldLabel>Sales Owner</FieldLabel>
                        <Controller
                          name='sales_owner'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={leadOptions.sales_owner || []}
                              placeholder='Select'
                              searchPlaceholder='Search owner...'
                              noResultsMessage='No owners found'
                              emptyMessage='No owners available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Inside Sales</FieldLabel>
                        <Controller
                          name='inside_sales'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={leadOptions.inside_sales || []}
                              placeholder='Select'
                              searchPlaceholder='Search sales...'
                              noResultsMessage='No sales found'
                              emptyMessage='No sales available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Lead Relevance</FieldLabel>
                        <Controller
                          name='lead_relevance'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={pipelineScopedLinkOptions.lead_relevance || []}
                              placeholder='Select'
                              searchPlaceholder='Search relevance...'
                              noResultsMessage='No relevance found'
                              emptyMessage='No relevance available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Need Urgency</FieldLabel>
                        <Controller
                          name='need_urgency'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={leadOptions.need_urgency || []}
                              placeholder='Select'
                              searchPlaceholder='Search urgency...'
                              noResultsMessage='No urgency found'
                              emptyMessage='No urgency available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>External ID</FieldLabel>
                        <Controller
                          name='external_id'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter external id' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Service ID</FieldLabel>
                        <Controller
                          name='service_id'
                          control={control}
                          render={({ field }) => {
                            const currentVal = field.value || '';
                            const selectOptions =
                              currentVal &&
                              !TRUEPULSE_SERVICE_OPTIONS.some((o) => o.value === currentVal)
                                ? [
                                    { value: currentVal, label: currentVal },
                                    ...TRUEPULSE_SERVICE_OPTIONS,
                                  ]
                                : TRUEPULSE_SERVICE_OPTIONS;

                            const handleSelectChange = (val) => {
                              field.onChange(val);
                              const sName = getServiceName(val);
                              if (sName) {
                                setValue('service_name', sName);
                              }
                            };

                            return (
                              <SearchableSelect
                                value={currentVal}
                                onValueChange={handleSelectChange}
                                options={selectOptions}
                                placeholder='Select Service ID'
                                searchPlaceholder='Search...'
                                noResultsMessage='No matching Service ID options'
                                emptyMessage='No Service ID options available'
                                triggerClassName='w-full'
                              />
                            );
                          }}
                        />
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Info Call Status</FieldLabel>
                        <Controller
                          name='info_call_status'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={leadOptions.info_call_status || []}
                              placeholder='Select'
                              searchPlaceholder='Search info call status...'
                              noResultsMessage='No info call statuses found'
                              emptyMessage='No info call statuses available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}

                {showMoreFields && activeTab === 'utm' && (
                  <>
                    <SectionTitle icon={<RiMapPinLine size={16} />}>UTM Details</SectionTitle>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                      <div className='flex flex-col'>
                        <FieldLabel>Lead Source</FieldLabel>
                        <Controller
                          name='lead_source'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={leadOptions.lead_source || []}
                              placeholder='Select'
                              searchPlaceholder='Search source...'
                              noResultsMessage='No sources found'
                              emptyMessage='No sources available'
                              isolateSearchKeyboard
                            />
                          )}
                        />
                      </div>
                      <div className='flex flex-col'>
                        <FieldLabel>Campaign</FieldLabel>
                        <Controller
                          name='campaign'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter campaign' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='flex flex-col'>
                        <FieldLabel>Source</FieldLabel>
                        <Controller
                          name='source'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter source' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='flex flex-col'>
                        <FieldLabel>Medium</FieldLabel>
                        <Controller
                          name='medium'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter medium' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='flex flex-col'>
                        <FieldLabel>Term</FieldLabel>
                        <Controller
                          name='term'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter term' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='flex flex-col'>
                        <FieldLabel>Content</FieldLabel>
                        <Controller
                          name='content'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter content' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='col-span-2 flex flex-col gap-2'>
                        <div className='flex items-center gap-1'>
                          <FieldLabel>Tags</FieldLabel>
                          <Tooltip.Root delayDuration={0}>
                            <Tooltip.Trigger asChild>
                              <button
                                type='button'
                                className='inline-flex text-text-soft-400 hover:text-text-sub-600'
                                aria-label='Type tags as tag1,tag2,tag3… then press Enter'
                              >
                                <RiInformationLine className='size-3.5' />
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content side='top' size='medium' className='max-w-xs'>
                              Type tags as tag1,tag2,tag3… — they save when you leave the field
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </div>
                        <Input.Root size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              placeholder='Type tags, separated by commas'
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleTagKeyDown}
                              onBlur={commitTagInput}
                              disabled={isSubmitting}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                        {tagArray.length > 0 && (
                          <div className='flex flex-wrap gap-2'>
                            {tagArray.map((item) => (
                              <Tag.Root key={item} variant='stroke'>
                                <span className='text-label-xs text-text-sub-600'>{item}</span>
                                <Tag.DismissButton
                                  onClick={() => removeTag(item)}
                                  aria-label={`Remove ${item}`}
                                />
                              </Tag.Root>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className='flex flex-col'>
                        <FieldLabel>GClid</FieldLabel>
                        <Controller
                          name='gclid'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter GClid' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='flex flex-col'>
                        <FieldLabel>Ad Group</FieldLabel>
                        <Controller
                          name='ad_group'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter ad group' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='col-span-2 flex flex-col'>
                        <FieldLabel>Landing Page URL</FieldLabel>
                        <Controller
                          name='landing_page_url'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter landing page URL' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='col-span-2 flex flex-col'>
                        <FieldLabel>Contact From URL</FieldLabel>
                        <Controller
                          name='contact_from_url'
                          control={control}
                          render={({ field }) => (
                            <Input.Root>
                              <Input.Wrapper>
                                <Input.Input {...field} placeholder='Enter contact from url' />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                      </div>
                      <div className='col-span-2 flex flex-col'>
                        <FieldLabel>Message</FieldLabel>
                        <Controller
                          name='message'
                          control={control}
                          render={({ field }) => (
                            <textarea
                              {...field}
                              rows={3}
                              placeholder='Enter contact message'
                              className='w-full resize-none rounded-lg border border-stroke-soft-200 px-3 py-2 text-paragraph-sm outline-none focus:ring-2 focus:ring-primary-base/20'
                            />
                          )}
                        />
                      </div>
                      <div className='col-span-2 flex flex-col'>
                        <FieldLabel>Contact Subject</FieldLabel>
                        <Controller
                          name='contact_subject'
                          control={control}
                          render={({ field }) => (
                            <textarea
                              {...field}
                              rows={3}
                              placeholder='Enter contact subject'
                              className='w-full resize-none rounded-lg border border-stroke-soft-200 px-3 py-2 text-paragraph-sm outline-none focus:ring-2 focus:ring-primary-base/20'
                            />
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}

                {showMoreFields && activeTab === 'delacon' && (
                  <>
                    <SectionTitle icon={<RiFileTextLine size={16} />}>Delacon Details</SectionTitle>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
                      {[
                        { name: 'delacon_info_date', label: 'Info Date', type: 'date' },
                        {
                          name: 'delacon_info_termination_point',
                          label: 'Info Termination Point',
                          placeholder: 'Enter info termination point',
                        },
                        {
                          name: 'delacon_info_call_status',
                          label: 'Info Call Status',
                          placeholder: 'Select',
                          type: 'select',
                        },
                        {
                          name: 'delacon_web_info_search_engine',
                          label: 'Web Info Search Engine',
                          placeholder: 'Enter web info search engine',
                        },
                        {
                          name: 'delacon_web_info_search_type',
                          label: 'Web Info Search Type',
                          placeholder: 'Enter web info search type',
                        },
                        {
                          name: 'delacon_city',
                          label: 'City',
                          placeholder: 'Select',
                          type: 'select',
                        },
                        {
                          name: 'delacon_adwords_info_conversions',
                          label: 'Adwords Info Conversions',
                          placeholder: 'Enter adwords info conversions',
                        },
                        {
                          name: 'delacon_adwords_info_cpc',
                          label: 'Adwords Info CPC',
                          placeholder: 'Enter adwords info CPC',
                        },
                        {
                          name: 'delacon_adwords_info_cost',
                          label: 'Adwords Info Cost',
                          placeholder: 'Enter adwords info cost',
                        },
                        {
                          name: 'delacon_info_caller',
                          label: 'Info Caller',
                          placeholder: 'Enter info caller',
                        },
                        {
                          name: 'delacon_adwords_info_clicks',
                          label: 'Adwords Info Clicks',
                          placeholder: 'Enter info clicks',
                        },
                        {
                          name: 'delacon_call_recording',
                          label: 'Call Recording',
                          placeholder: 'Enter call recording',
                        },
                        {
                          name: 'delacon_landing_page',
                          label: 'Landing Page',
                          placeholder: 'Enter landing page',
                        },
                        {
                          name: 'delacon_web_info_page_called_from',
                          label: 'Web Info Page Called From',
                          placeholder: 'Enter info page called from',
                        },
                        {
                          name: 'delacon_inside_sales_fr_tat',
                          label: 'Inside Sales FR TAT',
                          placeholder: 'Enter inside sales FR TAT',
                        },
                        {
                          name: 'delacon_sales_fr_tat',
                          label: 'Sales FR TAT',
                          placeholder: 'Enter sales FR TAT',
                        },
                      ].map(({ name, label, placeholder, type }) => (
                        <div key={name} className='flex flex-col'>
                          <FieldLabel>{label}</FieldLabel>
                          <Controller
                            name={name}
                            control={control}
                            render={({ field }) => {
                              if (type === 'date') {
                                return (
                                  <Datepicker
                                    variant='neutral'
                                    mode='stroke'
                                    value={field.value ? parseToDate(field.value) : undefined}
                                    onChange={(date) =>
                                      field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                                    }
                                    placeholder='DD-MM-YY'
                                    size='medium'
                                  />
                                );
                              }
                              if (type === 'select') {
                                if (name === 'delacon_city') {
                                  return (
                                    <CityCombobox
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder={placeholder}
                                    />
                                  );
                                }
                                if (name === 'delacon_info_call_status') {
                                  return (
                                    <Select.Root
                                      value={field.value || undefined}
                                      onValueChange={field.onChange}
                                    >
                                      <Select.Trigger>
                                        <Select.Value placeholder={placeholder} />
                                      </Select.Trigger>
                                      <Select.Content>
                                        {(leadOptions.info_call_status || []).map((opt) => (
                                          <Select.Item key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </Select.Item>
                                        ))}
                                      </Select.Content>
                                    </Select.Root>
                                  );
                                }
                                return (
                                  <Select.Root
                                    value={field.value || ''}
                                    onValueChange={field.onChange}
                                  >
                                    <Select.Trigger>
                                      <Select.Value placeholder={placeholder} />
                                    </Select.Trigger>
                                    <Select.Content>
                                      <Select.Item key='active' value='Active'>
                                        Active
                                      </Select.Item>
                                      <Select.Item key='inactive' value='Inactive'>
                                        Inactive
                                      </Select.Item>
                                    </Select.Content>
                                  </Select.Root>
                                );
                              }
                              return (
                                <Input.Root>
                                  <Input.Wrapper>
                                    <Input.Input {...field} placeholder={placeholder} />
                                  </Input.Wrapper>
                                </Input.Root>
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {showMoreFields && activeTab === 'account' && (
                  <>
                    <SectionTitle icon={<RiBuildingLine size={16} />}>Account</SectionTitle>
                    <div className='grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 [&>*]:min-w-0'>
                      <div className='flex flex-col'>
                        <FieldLabel>Account Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={accountTabFields.account_name}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Company Legal Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={accountTabFields.company_legal_name}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Sales Owner</FieldLabel>
                        {(() => {
                          const salesOwnerLabel =
                            (leadOptions.sales_owner || accountTabSelectOptions.sales_owner).find(
                              (o) => o.value === accountTabFields.sales_owner,
                            )?.label ?? accountTabFields.sales_owner;
                          if (!salesOwnerLabel) {
                            return (
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Input value='' placeholder='—' readOnly tabIndex={-1} />
                                </Input.Wrapper>
                              </Input.Root>
                            );
                          }
                          return (
                            <Tooltip.Root delayDuration={0}>
                              <Tooltip.Trigger asChild>
                                <div>
                                  <Input.Root>
                                    <Input.Wrapper>
                                      <div className='flex h-full min-h-10 w-full items-center px-3'>
                                        <CrmAccountAvatar name={salesOwnerLabel} size={28} />
                                      </div>
                                    </Input.Wrapper>
                                  </Input.Root>
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                side='top'
                                variant='light'
                                size='medium'
                                className='max-w-[280px] p-3'
                              >
                                <div className='flex min-w-0 items-center gap-2'>
                                  <CrmAccountAvatar
                                    name={salesOwnerLabel}
                                    size={32}
                                    className='shrink-0'
                                  />
                                  <div className='flex min-w-0 flex-col'>
                                    <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                                      {salesOwnerLabel}
                                    </span>
                                  </div>
                                </div>
                              </Tooltip.Content>
                            </Tooltip.Root>
                          );
                        })()}
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>CRM Contact</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <div className='flex h-full min-h-10 w-full items-center px-3'>
                              {accountTabSelectOptions.crm_contact.length > 0 ? (
                                <ContactsAvatars
                                  list={accountTabSelectOptions.crm_contact.map((opt) => ({
                                    name: opt.value,
                                    full_name: opt.label,
                                  }))}
                                />
                              ) : (
                                <span className='paragraph-small text-text-sub-500'>—</span>
                              )}
                            </div>
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>CP Account</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabSelectOptions.cp_account.find(
                                  (o) => o.value === accountTabFields.cp_account,
                                )?.label || accountTabFields.cp_account
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>CP Contact</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabSelectOptions.cp_contact.find(
                                  (o) => o.value === accountTabFields.cp_contact,
                                )?.label || accountTabFields.cp_contact
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Year of Est.</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabFields.year_of_establishment
                                  ? (() => {
                                      const d = parseToDate(accountTabFields.year_of_establishment);
                                      return d
                                        ? format(d, 'dd-MM-yy')
                                        : accountTabFields.year_of_establishment;
                                    })()
                                  : ''
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Type of Organization</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabSelectOptions.type_of_organization.find(
                                  (o) => o.value === accountTabFields.type_of_organization,
                                )?.label || accountTabFields.type_of_organization
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Industry</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabSelectOptions.industry.find(
                                  (o) => o.value === accountTabFields.industry,
                                )?.label || accountTabFields.industry
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Parent Company</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabSelectOptions.parent_company.find(
                                  (o) => o.value === accountTabFields.parent_company,
                                )?.label || accountTabFields.parent_company
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Associate Company</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabSelectOptions.associate_company.find(
                                  (o) => o.value === accountTabFields.associate_company,
                                )?.label || accountTabFields.associate_company
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Website</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={accountTabFields.website}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Employees Head Count</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                accountTabSelectOptions.no_of_employees.find(
                                  (o) => o.value === accountTabFields.no_of_employees,
                                )?.label || accountTabFields.no_of_employees
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>
                    </div>
                  </>
                )}

                {showMoreFields && activeTab === 'contact' && (
                  <>
                    <SectionTitle icon={<RiUserLine size={16} />}>Contact</SectionTitle>
                    <div className='grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 [&>*]:min-w-0'>
                      <div className='flex flex-col'>
                        <FieldLabel>First Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={contactTabFields.first_name}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Last Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={contactTabFields.last_name}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Department</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                contactTabSelectOptions.department.find(
                                  (o) => o.value === contactTabFields.department,
                                )?.label || contactTabFields.department
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Designation</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                contactTabSelectOptions.designation.find(
                                  (o) => o.value === contactTabFields.designation,
                                )?.label || contactTabFields.designation
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Email</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={contactTabFields.email}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Date of Birth</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                contactTabFields.date_of_birth
                                  ? (() => {
                                      const d = parseToDate(contactTabFields.date_of_birth);
                                      return d
                                        ? format(d, 'dd-MM-yy')
                                        : contactTabFields.date_of_birth;
                                    })()
                                  : ''
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Contact</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={contactTabFields.mobile_number}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Alternate Contact</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={contactTabFields.alt_mobile_number}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>City</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={contactTabFields.city}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Sales Owner</FieldLabel>
                        {(() => {
                          const salesOwnerLabel =
                            (leadOptions.sales_owner || contactTabSelectOptions.sales_owner).find(
                              (o) => o.value === contactTabFields.sales_owner,
                            )?.label ?? contactTabFields.sales_owner;
                          if (!salesOwnerLabel) {
                            return (
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Input value='' placeholder='—' readOnly tabIndex={-1} />
                                </Input.Wrapper>
                              </Input.Root>
                            );
                          }
                          return (
                            <Tooltip.Root delayDuration={0}>
                              <Tooltip.Trigger asChild>
                                <div>
                                  <Input.Root>
                                    <Input.Wrapper>
                                      <div className='flex h-full min-h-10 w-full items-center px-3'>
                                        <CrmAccountAvatar name={salesOwnerLabel} size={28} />
                                      </div>
                                    </Input.Wrapper>
                                  </Input.Root>
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                side='top'
                                variant='light'
                                size='medium'
                                className='max-w-[280px] p-3'
                              >
                                <div className='flex min-w-0 items-center gap-2'>
                                  <CrmAccountAvatar
                                    name={salesOwnerLabel}
                                    size={32}
                                    className='shrink-0'
                                  />
                                  <div className='flex min-w-0 flex-col'>
                                    <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                                      {salesOwnerLabel}
                                    </span>
                                  </div>
                                </div>
                              </Tooltip.Content>
                            </Tooltip.Root>
                          );
                        })()}
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Account Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                contactTabSelectOptions.associate_account.find(
                                  (o) => o.value === contactTabFields.associate_account,
                                )?.label || contactTabFields.associate_account
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>CP Account</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                contactTabSelectOptions.cp_account.find(
                                  (o) => o.value === contactTabFields.cp_account,
                                )?.label || contactTabFields.cp_account
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>CP Contact</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                contactTabSelectOptions.cp_contact.find(
                                  (o) => o.value === contactTabFields.cp_contact,
                                )?.label || contactTabFields.cp_contact
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>
                    </div>
                  </>
                )}

                {showMoreFields && activeTab === 'cp_account' && (
                  <>
                    <SectionTitle icon={<RiBuilding2Line size={16} />}>CP Account</SectionTitle>
                    <div className='grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 [&>*]:min-w-0'>
                      <div className='flex flex-col'>
                        <FieldLabel>Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.name}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Brand Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.brand_name}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Type</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                cpAccountTabSelectOptions.type.find(
                                  (o) => o.value === cpAccountTabFields.type,
                                )?.label || cpAccountTabFields.type
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>CP Contacts</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <div className='flex h-full min-h-10 w-full items-center px-3'>
                              {cpAccountTabSelectOptions.cp_contacts.length > 0 ? (
                                <ContactsAvatars
                                  list={cpAccountTabSelectOptions.cp_contacts.map((opt) => ({
                                    name: opt.value,
                                    full_name: opt.label,
                                  }))}
                                />
                              ) : (
                                <span className='paragraph-small text-text-sub-500'>—</span>
                              )}
                            </div>
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Year of Est.</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.year_of_establishment}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Industry</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                cpAccountTabSelectOptions.industry.find(
                                  (o) => o.value === cpAccountTabFields.industry,
                                )?.label || cpAccountTabFields.industry
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Parent Company</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                cpAccountTabSelectOptions.parent_company.find(
                                  (o) => o.value === cpAccountTabFields.parent_company,
                                )?.label || cpAccountTabFields.parent_company
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Associate Company</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                cpAccountTabSelectOptions.associate_company.find(
                                  (o) => o.value === cpAccountTabFields.associate_company,
                                )?.label || cpAccountTabFields.associate_company
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Website</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.website}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Employees Head Count</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.no_of_employees}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>RERA Number</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.rera_number}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Operational City</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.operational_city}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Operational State</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpAccountTabFields.operational_state}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>
                    </div>
                  </>
                )}

                {showMoreFields && activeTab === 'cp_contact' && (
                  <>
                    <SectionTitle icon={<RiContactsLine size={16} />}>CP Contact</SectionTitle>
                    <div className='grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 [&>*]:min-w-0'>
                      <div className='col-span-2 flex flex-col'>
                        <FieldLabel>Name</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.name}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Email</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.email}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Date of Birth</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                cpContactTabFields.date_of_birth
                                  ? (() => {
                                      const d = parseToDate(cpContactTabFields.date_of_birth);
                                      return d
                                        ? format(d, 'dd-MM-yy')
                                        : cpContactTabFields.date_of_birth;
                                    })()
                                  : ''
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Age</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.age}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Mobile Number</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.mobile_number}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Alt. Mobile Number</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.alt_mobile_number}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Associate CP Account</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={
                                cpContactTabSelectOptions.associate_cp_account.find(
                                  (o) => o.value === cpContactTabFields.associate_cp_account,
                                )?.label || cpContactTabFields.associate_cp_account
                              }
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Sales Owner</FieldLabel>
                        {(() => {
                          const salesOwnerLabel =
                            (leadOptions.sales_owner || cpContactTabSelectOptions.sales_owner).find(
                              (o) => o.value === cpContactTabFields.sales_owner,
                            )?.label ?? cpContactTabFields.sales_owner;
                          if (!salesOwnerLabel) {
                            return (
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Input value='' placeholder='—' readOnly tabIndex={-1} />
                                </Input.Wrapper>
                              </Input.Root>
                            );
                          }
                          return (
                            <Tooltip.Root delayDuration={0}>
                              <Tooltip.Trigger asChild>
                                <div>
                                  <Input.Root>
                                    <Input.Wrapper>
                                      <div className='flex h-full min-h-10 w-full items-center px-3'>
                                        <CrmAccountAvatar name={salesOwnerLabel} size={28} />
                                      </div>
                                    </Input.Wrapper>
                                  </Input.Root>
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                side='top'
                                variant='light'
                                size='medium'
                                className='max-w-[280px] p-3'
                              >
                                <div className='flex min-w-0 items-center gap-2'>
                                  <CrmAccountAvatar
                                    name={salesOwnerLabel}
                                    size={32}
                                    className='shrink-0'
                                  />
                                  <div className='flex min-w-0 flex-col'>
                                    <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                                      {salesOwnerLabel}
                                    </span>
                                  </div>
                                </div>
                              </Tooltip.Content>
                            </Tooltip.Root>
                          );
                        })()}
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Reporting Manager</FieldLabel>
                        {(() => {
                          const rmLabel =
                            cpContactTabSelectOptions.reporting_manager.find(
                              (o) => o.value === cpContactTabFields.reporting_manager,
                            )?.label ?? cpContactTabFields.reporting_manager;
                          if (!rmLabel) {
                            return (
                              <Input.Root>
                                <Input.Wrapper>
                                  <Input.Input value='' placeholder='—' readOnly tabIndex={-1} />
                                </Input.Wrapper>
                              </Input.Root>
                            );
                          }
                          return (
                            <Tooltip.Root delayDuration={0}>
                              <Tooltip.Trigger asChild>
                                <div>
                                  <Input.Root>
                                    <Input.Wrapper>
                                      <div className='flex h-full min-h-10 w-full items-center px-3'>
                                        <CrmAccountAvatar name={rmLabel} size={28} />
                                      </div>
                                    </Input.Wrapper>
                                  </Input.Root>
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                side='top'
                                variant='light'
                                size='medium'
                                className='max-w-[280px] p-3'
                              >
                                <div className='flex min-w-0 items-center gap-2'>
                                  <CrmAccountAvatar name={rmLabel} size={32} className='shrink-0' />
                                  <div className='flex min-w-0 flex-col'>
                                    <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                                      {rmLabel}
                                    </span>
                                  </div>
                                </div>
                              </Tooltip.Content>
                            </Tooltip.Root>
                          );
                        })()}
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Designation</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.designation}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Department</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.department}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>City</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.city}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Primary Contact</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.primary_contact}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Open Leads Amount (₹)</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.open_leads_amount}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='flex flex-col'>
                        <FieldLabel>Won Amount (₹)</FieldLabel>
                        <Input.Root>
                          <Input.Wrapper>
                            <Input.Input
                              value={cpContactTabFields.won_amount}
                              placeholder='—'
                              readOnly
                              tabIndex={-1}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabMenuVertical.Root>
          </Drawer.Body>

          <Drawer.Footer className='shrink-0 border-t border-stroke-soft-200 px-6 py-4 flex items-center justify-between'>
            <button
              type='button'
              onClick={() => setShowMoreFields(!showMoreFields)}
              className='text-paragraph-sm text-primary-base hover:underline'
            >
              {showMoreFields ? 'Show less fields' : 'Show more fields'}
            </button>
            <div className='flex gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={handleClose}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='submit'
                form='lead-create-form'
                variant='primary'
                size='small'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>

      <Modal.Root
        open={createContactModal.open}
        onOpenChange={(open) => {
          if (!open) closeCreateContactModal();
        }}
      >
        <Modal.Content className='max-w-[520px]' showClose={!isCreatingContact}>
          <Modal.Header>
            <Modal.Title>Create New Contact</Modal.Title>
          </Modal.Header>
          <Modal.Body className='px-6 py-4'>
            <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
              <div className='flex flex-col'>
                <FieldLabel required>First Name</FieldLabel>
                <Input.Root hasError={Boolean(createContactErrors.first_name)}>
                  <Input.Wrapper>
                    <Input.Input
                      value={createContactModal.first_name}
                      onChange={(e) => setCreateContactField('first_name', e.target.value)}
                      placeholder='Enter first name'
                      disabled={isCreatingContact}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {createContactErrors.first_name && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createContactErrors.first_name}
                  </Hint.Root>
                )}
              </div>

              <div className='flex flex-col'>
                <FieldLabel>Last Name</FieldLabel>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input
                      value={createContactModal.last_name}
                      onChange={(e) => setCreateContactField('last_name', e.target.value)}
                      placeholder='Enter last name'
                      disabled={isCreatingContact}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>

              <div className='col-span-2 flex flex-col'>
                <FieldLabel>Email</FieldLabel>
                <Input.Root
                  hasError={Boolean(createContactErrors.email || createContactErrors.contact)}
                >
                  <Input.Wrapper>
                    <Input.Input
                      value={createContactModal.email}
                      onChange={(e) => setCreateContactField('email', e.target.value)}
                      placeholder='Enter email address'
                      disabled={isCreatingContact}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {createContactErrors.email && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createContactErrors.email}
                  </Hint.Root>
                )}
                {!createContactErrors.email && createContactErrors.contact && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createContactErrors.contact}
                  </Hint.Root>
                )}
              </div>

              <div className='col-span-2 flex flex-col'>
                <FieldLabel>Phone Number</FieldLabel>
                <PhoneInputController
                  value={createContactModal.mobile_number}
                  onChange={(v) => setCreateContactField('mobile_number', v)}
                  placeholder='Enter mobile number'
                  size='medium'
                  error={createContactErrors.contact}
                  disabled={isCreatingContact}
                />
                {createContactErrors.contact && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createContactErrors.contact}
                  </Hint.Root>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className='px-6 py-4 gap-3 flex justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isCreatingContact}
              onClick={closeCreateContactModal}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={isCreatingContact}
              onClick={handleSubmitCreateContact}
            >
              {isCreatingContact ? 'Creating...' : 'Create Contact'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root
        open={createCpAccountModal.open}
        onOpenChange={(open) => {
          if (!open) closeCreateCpAccountModal();
        }}
      >
        <Modal.Content className='max-w-[520px]' showClose={!isCreatingCpAccount}>
          <Modal.Header>
            <Modal.Title>Create New CP Account</Modal.Title>
          </Modal.Header>
          <Modal.Body className='px-6 py-4'>
            <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
              <div className='flex flex-col'>
                <FieldLabel required>Name</FieldLabel>
                <Input.Root hasError={Boolean(createCpAccountErrors.name)}>
                  <Input.Wrapper>
                    <Input.Input
                      value={createCpAccountModal.name}
                      onChange={(e) => setCreateCpAccountField('name', e.target.value)}
                      placeholder='Enter name'
                      disabled={isCreatingCpAccount}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {createCpAccountErrors.name && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createCpAccountErrors.name}
                  </Hint.Root>
                )}
              </div>

              <div className='flex flex-col'>
                <FieldLabel required>Brand Name</FieldLabel>
                <Input.Root hasError={Boolean(createCpAccountErrors.brand_name)}>
                  <Input.Wrapper>
                    <Input.Input
                      value={createCpAccountModal.brand_name}
                      onChange={(e) => setCreateCpAccountField('brand_name', e.target.value)}
                      placeholder='Enter brand name'
                      disabled={isCreatingCpAccount}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {createCpAccountErrors.brand_name && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createCpAccountErrors.brand_name}
                  </Hint.Root>
                )}
              </div>

              <div className='col-span-2 flex flex-col'>
                <FieldLabel required>Type</FieldLabel>
                <SearchableSelect
                  value={createCpAccountModal.type}
                  onValueChange={(v) => setCreateCpAccountField('type', v)}
                  options={cpAccountTypeOptions}
                  placeholder='Select type'
                  searchPlaceholder='Search type...'
                  noResultsMessage='No types found'
                  emptyMessage='No types available'
                  hasError={Boolean(createCpAccountErrors.type)}
                  disabled={isCreatingCpAccount}
                  isolateSearchKeyboard
                  contentClassName='z-[200]'
                />
                {createCpAccountErrors.type && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createCpAccountErrors.type}
                  </Hint.Root>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className='px-6 py-4 gap-3 flex justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isCreatingCpAccount}
              onClick={closeCreateCpAccountModal}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={isCreatingCpAccount}
              onClick={handleSubmitCreateCpAccount}
            >
              {isCreatingCpAccount ? 'Creating...' : 'Create CP Account'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root
        open={createCpContactModal.open}
        onOpenChange={(open) => {
          if (!open) closeCreateCpContactModal();
        }}
      >
        <Modal.Content className='max-w-[520px]' showClose={!isCreatingCpContact}>
          <Modal.Header>
            <Modal.Title>Create New CP Contact</Modal.Title>
          </Modal.Header>
          <Modal.Body className='px-6 py-4'>
            <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
              <div className='flex flex-col'>
                <FieldLabel required>First Name</FieldLabel>
                <Input.Root hasError={Boolean(createCpContactErrors.first_name)}>
                  <Input.Wrapper>
                    <Input.Input
                      value={createCpContactModal.first_name}
                      onChange={(e) => setCreateCpContactField('first_name', e.target.value)}
                      placeholder='Enter first name'
                      disabled={isCreatingCpContact}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {createCpContactErrors.first_name && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createCpContactErrors.first_name}
                  </Hint.Root>
                )}
              </div>

              <div className='flex flex-col'>
                <FieldLabel required>Last Name</FieldLabel>
                <Input.Root hasError={Boolean(createCpContactErrors.last_name)}>
                  <Input.Wrapper>
                    <Input.Input
                      value={createCpContactModal.last_name}
                      onChange={(e) => setCreateCpContactField('last_name', e.target.value)}
                      placeholder='Enter last name'
                      disabled={isCreatingCpContact}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {createCpContactErrors.last_name && (
                  <Hint.Root hasError className='mt-1'>
                    <Hint.Icon as={RiInformationFill} />
                    {createCpContactErrors.last_name}
                  </Hint.Root>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className='px-6 py-4 gap-3 flex justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isCreatingCpContact}
              onClick={closeCreateCpContactModal}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={isCreatingCpContact}
              onClick={handleSubmitCreateCpContact}
            >
              {isCreatingCpContact ? 'Creating...' : 'Create CP Contact'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root
        open={primaryLeadModal.open}
        onOpenChange={(open) => {
          if (!open) setPrimaryLeadModal((p) => ({ ...p, open: false, pendingData: null }));
        }}
      >
        <Modal.Content className='max-w-[440px]' showClose={true}>
          <Modal.Header>
            <Modal.Title>This contact already has an active lead</Modal.Title>
          </Modal.Header>
          <Modal.Body className='px-6 py-4'>
            <p className='text-paragraph-sm text-text-sub-600'>
              This contact is linked to an active lead:{' '}
              <strong>{primaryLeadModal.existingLeadName}</strong>. Do you want to keep that lead as
              active, or make this new lead the active one?
            </p>
          </Modal.Body>
          <Modal.Footer className='px-6 py-4 gap-3 flex justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isSubmitting}
              onClick={() => {
                if (primaryLeadModal.pendingData) doSubmit(primaryLeadModal.pendingData, false);
              }}
            >
              Keep current active lead
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={isSubmitting}
              onClick={() => {
                if (primaryLeadModal.pendingData) doSubmit(primaryLeadModal.pendingData, true);
              }}
            >
              {isSubmitting ? 'Creating...' : 'Make new lead active'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Drawer.Root>
  );
};

export default CrmLeadCreateDrawer;
