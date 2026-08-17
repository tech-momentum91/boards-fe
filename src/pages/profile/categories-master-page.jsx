import React from 'react';
import { useLocation } from 'react-router-dom';

import CategoriesMasterLanding from '@/pages/profile/categories-master-landing';
import CategoriesSectionShell from '@/pages/profile/categories-section-shell';
import ProductCategoriesPage from '@/pages/profile/product-categories/product-categories-page';
import ClinetOpex from '@/pages/profile/client-opex';
import BillingCategoriesPage from '@/pages/profile/billing-categories-page';
import {
  CATEGORIES_MASTER_BILLING,
  CATEGORIES_MASTER_OPEX,
  CATEGORIES_MASTER_PRODUCT,
  CATEGORIES_MASTER_ROOT,
} from '@/pages/profile/categories-master-paths';

/**
 * Categories Master shell: landing hub vs category configuration sections.
 */
const CategoriesMasterPage = () => {
  const location = useLocation();

  const isLanding = location.pathname === CATEGORIES_MASTER_ROOT;
  const isProductSection = location.pathname.startsWith(`${CATEGORIES_MASTER_PRODUCT}/`);
  const isOpexSection = location.pathname.startsWith(CATEGORIES_MASTER_OPEX);
  const isBillingSection = location.pathname.startsWith(CATEGORIES_MASTER_BILLING);

  return (
    <div className='flex h-full w-full flex-col'>
      {isLanding ? <CategoriesMasterLanding /> : null}
      {isProductSection ? <ProductCategoriesPage /> : null}
      {isOpexSection ? (
        <CategoriesSectionShell sectionLabel='OPEX'>
          <ClinetOpex />
        </CategoriesSectionShell>
      ) : null}
      {isBillingSection ? (
        <CategoriesSectionShell sectionLabel='Billing'>
          <BillingCategoriesPage />
        </CategoriesSectionShell>
      ) : null}
    </div>
  );
};

export default CategoriesMasterPage;
