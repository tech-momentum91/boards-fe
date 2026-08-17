import React from 'react';

import AssetOutDetailRouteWrapper from '@/components/aum/asset-out/asset-out-detail-route-wrapper';
import { AUM_PAGE_META, AumPageIcon } from '@/components/aum/constants';
import PageLayout from '@/components/page-layout';
import WithAumModulePermission from '@/route-protection/with-aum-module-permission';

function AumAssetOutDetailPage() {
  return (
    <PageLayout
      pageTitle={AUM_PAGE_META.title}
      pageIcon={<AumPageIcon />}
      pageDescription={AUM_PAGE_META.description}
      showDefaultHeader={false}
      borderDivClassName='hidden'
    >
      <AssetOutDetailRouteWrapper />
    </PageLayout>
  );
}

export default WithAumModulePermission(AumAssetOutDetailPage);
