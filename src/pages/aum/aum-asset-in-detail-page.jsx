import React from 'react';
import PageLayout from '@/components/page-layout';
import { AUM_PAGE_META, AumPageIcon } from '@/components/aum/constants';
import AssetInDetailRouteWrapper from '@/components/aum/asset-in/asset-in-detail-route-wrapper';
import WithAumModulePermission from '@/route-protection/with-aum-module-permission';

function AumAssetInDetailPage() {
  return (
    <PageLayout
      pageTitle={AUM_PAGE_META.title}
      pageIcon={<AumPageIcon />}
      pageDescription={AUM_PAGE_META.description}
      showDefaultHeader={false}
      borderDivClassName='hidden'
    >
      <AssetInDetailRouteWrapper />
    </PageLayout>
  );
}

export default WithAumModulePermission(AumAssetInDetailPage);
