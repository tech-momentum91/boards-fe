import React from 'react';
import { getFieldValue } from '@/redux/clientDetailSlice';
import {
  COMPANY_IDENTITY_FIELDS,
  LOCATION_FIELDS,
  ORG_HEADCOUNT_FIELDS,
  CLASSIFICATION_STRUCTURE_FIELDS,
} from '@/components/clients-management/client-detail-about/client-overview-fields';
import {
  PRODUCT_SERVICES_FIELDS,
  MARKET_COMPETITIVE_FIELDS,
} from '@/components/clients-management/client-detail-about/client-market-insights-fields';
import {
  DIGITAL_PRESENCE_FIELDS,
  NEWS_SIGNALS_FIELDS,
  COMPLIANCE_LEGAL_FIELDS,
} from '@/components/clients-management/client-detail-about/client-news-signal-fields';
import {
  FUNDING_INVESTMENT_FIELDS,
  FINANCIAL_DATA_FIELDS,
} from '@/components/clients-management/client-detail-about/client-funding-fields';

const EMPTY_CHANGES = {};

function shouldShowField(field, account) {
  if (!field.hideWhenNull) return true;
  const value = getFieldValue(account, EMPTY_CHANGES, field.key);
  return value != null && String(value).trim() !== '';
}

function ReadOnlyField({ label, value, fullWidth }) {
  return (
    <div className={fullWidth ? 'col-span-1 sm:col-span-2' : undefined}>
      <div className='flex flex-col gap-1'>
        <span className='text-paragraph-sm text-text-sub-500 opacity-72'>{label}</span>
        <span className='whitespace-pre-wrap text-label-sm font-semibold text-text-main-900/90'>
          {value || '--'}
        </span>
      </div>
    </div>
  );
}

function ReadOnlyFieldGrid({ fields, account }) {
  const visibleFields = fields.filter((field) => shouldShowField(field, account));
  if (visibleFields.length === 0) {
    return <p className='text-paragraph-sm text-text-sub-500'>No data available.</p>;
  }

  return (
    <div className='grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2'>
      {visibleFields.map((field) => (
        <ReadOnlyField
          key={field.key}
          label={field.label}
          value={getFieldValue(account, EMPTY_CHANGES, field.key)}
          fullWidth={field.fullWidth}
        />
      ))}
    </div>
  );
}

function ResearchSection({ title, children }) {
  return (
    <div className='flex flex-col gap-3 border-b border-stroke-soft-200 py-6 last:border-0'>
      <span className='px-1 text-title-h6 font-semibold text-text-main-900'>{title}</span>
      <div className='px-1'>{children}</div>
    </div>
  );
}

function CompanyFoundationPanel({ account }) {
  return (
    <div className='flex flex-col'>
      <ResearchSection title='Identity & Branding'>
        <ReadOnlyFieldGrid fields={COMPANY_IDENTITY_FIELDS} account={account} />
      </ResearchSection>
      <ResearchSection title='Classification & Structure'>
        <ReadOnlyFieldGrid fields={CLASSIFICATION_STRUCTURE_FIELDS} account={account} />
      </ResearchSection>
      <ResearchSection title='Location & Geography'>
        <ReadOnlyFieldGrid fields={LOCATION_FIELDS} account={account} />
      </ResearchSection>
      <ResearchSection title='Organization & Leadership'>
        <ReadOnlyFieldGrid fields={ORG_HEADCOUNT_FIELDS} account={account} />
      </ResearchSection>
    </div>
  );
}

function MarketPositionPanel({ account }) {
  return (
    <div className='flex flex-col'>
      <ResearchSection title='Product & Services'>
        <ReadOnlyFieldGrid fields={PRODUCT_SERVICES_FIELDS} account={account} />
      </ResearchSection>
      <ResearchSection title='Market & Competitive Landscape'>
        <ReadOnlyFieldGrid fields={MARKET_COMPETITIVE_FIELDS} account={account} />
      </ResearchSection>
    </div>
  );
}

function DigitalPresencePanel({ account }) {
  return (
    <div className='flex flex-col'>
      <ResearchSection title='Digital Presence'>
        <ReadOnlyFieldGrid fields={DIGITAL_PRESENCE_FIELDS} account={account} />
      </ResearchSection>
      <ResearchSection title='News & Signals'>
        <ReadOnlyFieldGrid fields={NEWS_SIGNALS_FIELDS} account={account} />
      </ResearchSection>
      <ResearchSection title='Compliance & Legal'>
        <ReadOnlyFieldGrid fields={COMPLIANCE_LEGAL_FIELDS} account={account} />
      </ResearchSection>
    </div>
  );
}

function FinancialInvestmentPanel({ account }) {
  return (
    <div className='flex flex-col'>
      <ResearchSection title='Funding & Investment'>
        <ReadOnlyFieldGrid fields={FUNDING_INVESTMENT_FIELDS} account={account} />
      </ResearchSection>
      <ResearchSection title='Financial Data'>
        <ReadOnlyFieldGrid fields={FINANCIAL_DATA_FIELDS} account={account} />
      </ResearchSection>
    </div>
  );
}

const PANELS = {
  'company-foundation': CompanyFoundationPanel,
  'market-position-offerings': MarketPositionPanel,
  'digital-presence-signal': DigitalPresencePanel,
  'financial-investment-performance': FinancialInvestmentPanel,
};

export default function AccountResearchPanels({ activeSidebarItem, account }) {
  const Panel = PANELS[activeSidebarItem];
  if (!Panel || !account) return null;
  return <Panel account={account} />;
}
