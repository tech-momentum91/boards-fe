import PageLayout from '@/components/page-layout';
import { STOCKS_PAGE_META, StocksPageIcon } from '@/components/stocks/constants';
import StocksView from '@/components/stocks/stocks-view';

export default function Stocks() {
  return (
    <PageLayout
      pageTitle={STOCKS_PAGE_META.title}
      pageIcon={<StocksPageIcon />}
      pageDescription={STOCKS_PAGE_META.description}
      borderDivClassName='hidden'
    >
      <StocksView />
    </PageLayout>
  );
}
