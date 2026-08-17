import PageLayout from '@/components/page-layout';
import AumView from '@/components/aum/aum-view';
import { AUM_PAGE_META, AumPageIcon } from '@/components/aum/constants';
import WithAumModulePermission from '@/route-protection/with-aum-module-permission';

function Aum() {
  return (
    <PageLayout
      pageTitle={AUM_PAGE_META.title}
      pageIcon={<AumPageIcon />}
      pageDescription={AUM_PAGE_META.description}
      borderDivClassName='hidden'
    >
      <AumView />
    </PageLayout>
  );
}

export default WithAumModulePermission(Aum);
