import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getProduct } from '@/api/products';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import PageLayout from '@/components/page-layout';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/products', { replace: true });
      return;
    }

    let cancelled = false;

    getProduct(id)
      .then((productData) => {
        if (cancelled) return;

        if (!productData) {
          navigate('/products', { replace: true });
          return;
        }

        const resolvedId = productData.id;
        if (productData.devxProductType === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
          navigate(`/products?tab=${PRODUCTS_TAB_IDS.PRODUCT_PACKAGE}`, {
            replace: true,
            state: { openPackageId: resolvedId },
          });
          return;
        }

        const productTab =
          productData.devxProductType === PRODUCTS_TAB_IDS.JOB
            ? PRODUCTS_TAB_IDS.JOB
            : PRODUCTS_TAB_IDS.PRODUCT;

        navigate(`/products?tab=${productTab}`, {
          replace: true,
          state: { openProductId: resolvedId },
        });
      })
      .catch(() => {
        if (!cancelled) {
          navigate('/products', { replace: true, state: { openProductId: id } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  return (
    <PageLayout showDefaultHeader={false} borderDivClassName='hidden'>
      <div className='flex h-full flex-col items-center justify-center p-8'>
        <p className='text-paragraph-md text-text-sub-500'>Opening product…</p>
      </div>
    </PageLayout>
  );
}
