import PageLayout from '@/components/page-layout';
import BoqView from '@/components/boq/boq-view';
import { BOQ_PAGE_META, BoqPageIcon } from '@/components/boq/constants';

export default function Boq() {
  return (
    <PageLayout
      pageTitle={BOQ_PAGE_META.title}
      pageIcon={<BoqPageIcon size={20} />}
      pageDescription={BOQ_PAGE_META.description}
      borderDivClassName='hidden'
    >
      <BoqView />
    </PageLayout>
  );
}
