import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

import ComingSoonMessage from '@/components/coming-soon-message';
import ProcurementPosPage from '@/components/procurements/procurement-pos-page';
import ProjectProcurementsFiscalYearDropdown from '@/components/procurements/project-procurements-fiscal-year-dropdown';
import ProjectProcurementsPage from '@/components/procurements/project-procurements-page';
import VendorPaymentsPage from '@/components/procurements/vendor-payments-page';
import {
  PROCUREMENTS_DEFAULT_SECTION,
  PROCUREMENTS_SECTION_IDS,
  PROCUREMENTS_SECTIONS,
  ProcurementPageIcon,
  VALID_PROCUREMENTS_SECTION_IDS,
  VendorPaymentsPageIcon,
} from '@/components/procurements/constants';
import { getCurrentIndianFiscalYearStart } from '@/components/procurements/project-procurements-utils';
import PageLayout from '@/components/page-layout';

export default function Procurements() {
  const { section } = useParams();
  const [fiscalYearStart, setFiscalYearStart] = React.useState(() =>
    String(getCurrentIndianFiscalYearStart()),
  );

  if (!section || !VALID_PROCUREMENTS_SECTION_IDS.has(section)) {
    return <Navigate to={`/procurements/${PROCUREMENTS_DEFAULT_SECTION}`} replace />;
  }

  const activeSection =
    PROCUREMENTS_SECTIONS.find((item) => item.id === section) ?? PROCUREMENTS_SECTIONS[0];

  const isProjectProcurements = section === PROCUREMENTS_SECTION_IDS.PROJECT_PROCUREMENTS;
  const isPos = section === PROCUREMENTS_SECTION_IDS.POS;
  const isVendorPayments = section === PROCUREMENTS_SECTION_IDS.VENDOR_PAYMENTS;
  const showFiscalYear = isProjectProcurements || isVendorPayments;

  const pageIcon = isVendorPayments ? (
    <VendorPaymentsPageIcon size={24} />
  ) : (
    <ProcurementPageIcon size={20} />
  );

  return (
    <PageLayout
      pageTitle={activeSection.title}
      pageIcon={pageIcon}
      pageDescription={activeSection.description ?? undefined}
      borderDivClassName='hidden'
      contentAreaClassName={
        isProjectProcurements || isVendorPayments || isPos ? 'overflow-hidden' : undefined
      }
      headerActions={
        showFiscalYear ? (
          <ProjectProcurementsFiscalYearDropdown
            value={fiscalYearStart}
            onValueChange={setFiscalYearStart}
          />
        ) : null
      }
    >
      {isProjectProcurements ? (
        <ProjectProcurementsPage fiscalYearStart={fiscalYearStart} />
      ) : isVendorPayments ? (
        <VendorPaymentsPage />
      ) : isPos ? (
        <ProcurementPosPage />
      ) : (
        <ComingSoonMessage />
      )}
    </PageLayout>
  );
}
