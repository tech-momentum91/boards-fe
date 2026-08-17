import React, { useState } from 'react';

import {
  PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TAB_IDS,
  PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TABS,
} from '@/components/procurements/constants';
import ProjectProcurementPaymentRegisterTab from '@/components/procurements/project-procurement-payment-register-tab';
import ProjectProcurementPaymentSheetsTab from '@/components/procurements/project-procurement-payment-sheets-tab';
import { cn } from '@/utils/cn';

function PaymentPlanningSubTab({ active, label, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'rounded-[6px] bg-white px-3 py-1 text-label-sm font-medium text-[#344054] transition-colors',
        active
          ? 'border-[1.5px] border-[rgba(71,84,103,0.5)]'
          : 'border border-[#eaecf0] hover:bg-bg-weak-50',
      )}
    >
      {label}
    </button>
  );
}

export default function ProjectProcurementPaymentPlanningTab({ projectId }) {
  const [activeSubTab, setActiveSubTab] = useState(
    PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TAB_IDS.PAYMENT_REGISTER,
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      {/* Sub-tab bar background — Figma 34434:221437 */}
      <div className='shrink-0 bg-[#e8e9ed]/30 px-0 py-[14px]'>
        <div className='flex items-center gap-1.5 px-0'>
          {PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TABS.map((tab) => (
            <PaymentPlanningSubTab
              key={tab.id}
              active={activeSubTab === tab.id}
              label={tab.label}
              onClick={() => setActiveSubTab(tab.id)}
            />
          ))}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden pt-5'>
        {activeSubTab === PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TAB_IDS.PAYMENT_REGISTER ? (
          <ProjectProcurementPaymentRegisterTab projectId={projectId} />
        ) : (
          <ProjectProcurementPaymentSheetsTab projectId={projectId} />
        )}
      </div>
    </div>
  );
}
