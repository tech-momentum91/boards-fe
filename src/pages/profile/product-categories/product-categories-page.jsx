import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { RiArrowRightSLine } from 'react-icons/ri';

import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import ProductCategoriesTreeTable from '@/pages/profile/product-categories/product-categories-tree-table';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  createProductCategoryDraftRow,
  PRODUCT_CATEGORY_DEFAULT_TAB,
  PRODUCT_CATEGORY_FIELD_KEYS,
  PRODUCT_CATEGORY_ASSET_TYPE,
  productCategoryAssetTypeToFlags,
  PRODUCT_CATEGORY_TAB_IDS,
} from '@/pages/profile/product-categories/constants';
import {
  CATEGORIES_MASTER_ROOT,
  productCategoriesPath,
} from '@/pages/profile/categories-master-paths';
import {
  canAddChildToParent,
  canAddRootCategoryGroup,
  cascadeProductCategoryFlag,
  draftBelongsToParent,
  PRODUCT_CATEGORY_CHILD_TAB,
} from '@/pages/profile/product-categories/product-categories-tree-utils';
import {
  ensureProductCategoryTabInitialized,
  clearProductCategoriesMutationError,
  loadProductCategories,
  patchProductCategoryRow,
  removeProductCategoryRow,
  saveProductCategoryRow,
  selectProductCategoriesError,
  selectProductCategoriesMutationStatus,
  selectProductCategoriesRowsByTab,
  selectProductCategoriesStatus,
  setProductCategoryTabRows,
} from '@/redux/productCategoriesSlice';

const ProductCategoriesPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useStore();
  const { section } = useParams();

  const rowsByTab = useSelector(selectProductCategoriesRowsByTab);
  const status = useSelector(selectProductCategoriesStatus);
  const loadError = useSelector(selectProductCategoriesError);
  const mutationStatus = useSelector(selectProductCategoriesMutationStatus);
  const [rowToDelete, setRowToDelete] = useState(null);

  useEffect(() => {
    dispatch(loadProductCategories());
  }, [dispatch]);

  useEffect(() => {
    if (section && section !== PRODUCT_CATEGORY_DEFAULT_TAB) {
      navigate(productCategoriesPath(PRODUCT_CATEGORY_DEFAULT_TAB), { replace: true });
    }
  }, [navigate, section]);

  useEffect(() => {
    Object.values(PRODUCT_CATEGORY_TAB_IDS).forEach((tabId) => {
      dispatch(ensureProductCategoryTabInitialized({ tabId }));
    });
  }, [dispatch]);

  const handleRemoveRow = useCallback(
    (tabId, rowId) => {
      const currentRows = rowsByTab[tabId] ?? [];
      const targetRow = currentRows.find((row) => row.id === rowId);

      if (targetRow?.isDraft) {
        dispatch(
          setProductCategoryTabRows({
            tabId,
            rows: currentRows.filter((row) => row.id !== rowId),
          }),
        );
        return;
      }

      dispatch(clearProductCategoriesMutationError());
      setRowToDelete({
        tabId,
        rowId,
        name: targetRow?.name ?? 'this category',
      });
    },
    [dispatch, rowsByTab],
  );

  const handleDeleteModalOpenChange = useCallback(
    (open) => {
      if (open || mutationStatus === 'loading') return;
      setRowToDelete(null);
      dispatch(clearProductCategoriesMutationError());
    },
    [dispatch, mutationStatus],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!rowToDelete || mutationStatus === 'loading') return;

    try {
      await dispatch(
        removeProductCategoryRow({
          tabId: rowToDelete.tabId,
          rowId: rowToDelete.rowId,
        }),
      ).unwrap();
      setRowToDelete(null);
      showSuccessToast('Category deleted successfully.');
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to delete product category. Please try again.',
      });
    }
  }, [dispatch, mutationStatus, rowToDelete]);

  const upsertDraftRow = useCallback(
    (tabId, draft, parentRow = null) => {
      const currentRows = rowsByTab[tabId] ?? [];
      const keptRows = currentRows.filter(
        (row) => !row.isDraft || !draftBelongsToParent(row, tabId, parentRow),
      );

      dispatch(
        setProductCategoryTabRows({
          tabId,
          rows: [...keptRows, draft],
        }),
      );
    },
    [dispatch, rowsByTab],
  );

  const handleAddCategoryGroup = useCallback(() => {
    if (!canAddRootCategoryGroup()) return;
    upsertDraftRow(PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP, createProductCategoryDraftRow());
  }, [rowsByTab, upsertDraftRow]);

  const handleAddChild = useCallback(
    (childTabId, parentRow) => {
      const parentTabId = Object.keys(PRODUCT_CATEGORY_CHILD_TAB).find(
        (tabId) => PRODUCT_CATEGORY_CHILD_TAB[tabId] === childTabId,
      );

      if (!parentTabId || !canAddChildToParent(parentTabId)) {
        return;
      }

      const draft = createProductCategoryDraftRow();

      if (childTabId === PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY) {
        draft[PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_GROUP_ID] = parentRow.id;
      } else if (childTabId === PRODUCT_CATEGORY_TAB_IDS.CATEGORY) {
        draft[PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_GROUP_ID] = parentRow.categoryGroupId;
        draft[PRODUCT_CATEGORY_FIELD_KEYS.PARENT_CATEGORY_ID] = parentRow.id;
      } else if (childTabId === PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP) {
        draft[PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_GROUP_ID] = parentRow.categoryGroupId;
        draft[PRODUCT_CATEGORY_FIELD_KEYS.PARENT_CATEGORY_ID] = parentRow.parentCategoryId;
        draft[PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_ID] = parentRow.id;
      }

      if (parentRow[PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET]) {
        draft[PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET] = true;
        draft[PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK] = false;
      } else if (parentRow[PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK]) {
        draft[PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK] = true;
        draft[PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET] = false;
      }

      upsertDraftRow(childTabId, draft, parentRow);
    },
    [upsertDraftRow],
  );

  const handleUpdateRow = useCallback(
    (tabId, rowId, patch) => {
      dispatch(patchProductCategoryRow({ tabId, rowId, patch }));
    },
    [dispatch],
  );

  const handleAssetTypeChange = useCallback(
    (tabId, row, assetType) => {
      const flags = productCategoryAssetTypeToFlags(assetType);
      let nextRowsByTab = rowsByTab;
      const nextRow = { ...row, ...flags };

      if (
        assetType === PRODUCT_CATEGORY_ASSET_TYPE.FIXED_ASSET ||
        assetType === PRODUCT_CATEGORY_ASSET_TYPE.MAINTAIN_STOCK
      ) {
        const field =
          assetType === PRODUCT_CATEGORY_ASSET_TYPE.FIXED_ASSET
            ? PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET
            : PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK;
        nextRowsByTab = cascadeProductCategoryFlag(rowsByTab, row, tabId, field, true);
      } else {
        const currentRows = rowsByTab[tabId] ?? [];
        nextRowsByTab = {
          ...rowsByTab,
          [tabId]: currentRows.map((item) => (item.id === row.id ? nextRow : item)),
        };
      }

      Object.entries(nextRowsByTab).forEach(([nextTabId, rows]) => {
        dispatch(setProductCategoryTabRows({ tabId: nextTabId, rows }));
      });

      if (row.isDraft) return;

      const savedRow = nextRowsByTab[tabId]?.find((item) => item.id === row.id) ?? nextRow;

      dispatch(
        saveProductCategoryRow({
          tabId,
          row: savedRow,
        }),
      )
        .unwrap()
        .catch((error) => {
          showErrorToast(error, {
            defaultMessage: 'Failed to update product category. Please try again.',
          });
          dispatch(loadProductCategories());
        });
    },
    [dispatch, rowsByTab],
  );

  const handleNameChange = useCallback(
    (tabId, row, name) => {
      const trimmedName = name?.trim() ?? '';
      if (!trimmedName || trimmedName === row.name) return;

      const nextRow = { ...row, name: trimmedName };
      const currentRows = rowsByTab[tabId] ?? [];

      dispatch(
        setProductCategoryTabRows({
          tabId,
          rows: currentRows.map((item) => (item.id === row.id ? nextRow : item)),
        }),
      );

      if (row.isDraft) return;

      dispatch(
        saveProductCategoryRow({
          tabId,
          row: nextRow,
        }),
      )
        .unwrap()
        .then((result) => {
          if (result?.renamed) {
            showSuccessToast('Category renamed successfully.');
          }
        })
        .catch((error) => {
          showErrorToast(error, {
            defaultMessage: 'Failed to rename category. Please try again.',
          });
          dispatch(loadProductCategories());
        });
    },
    [dispatch, rowsByTab],
  );

  const handleHsnChange = useCallback(
    (tabId, row, hsnCode) => {
      const nextRow = { ...row, [PRODUCT_CATEGORY_FIELD_KEYS.HSN_CODE]: hsnCode || '' };
      const currentRows = rowsByTab[tabId] ?? [];

      dispatch(
        setProductCategoryTabRows({
          tabId,
          rows: currentRows.map((item) => (item.id === row.id ? nextRow : item)),
        }),
      );

      if (row.isDraft) return;

      dispatch(
        saveProductCategoryRow({
          tabId,
          row: nextRow,
        }),
      )
        .unwrap()
        .catch((error) => {
          showErrorToast(error, {
            defaultMessage: 'Failed to update HSN code mapping. Please try again.',
          });
          dispatch(loadProductCategories());
        });
    },
    [dispatch, rowsByTab],
  );

  const handleSaveRow = useCallback(
    (tabId, rowId, pendingPatch = {}) => {
      const rowsByTab = selectProductCategoriesRowsByTab(store.getState());
      const currentRows = rowsByTab[tabId] ?? [];
      const draftRow = currentRows.find((row) => row.id === rowId && row.isDraft);
      if (!draftRow) return;

      const mergedRow = { ...draftRow, ...pendingPatch };
      const name = mergedRow.name?.trim();

      if (!name) return;

      dispatch(
        saveProductCategoryRow({
          tabId,
          row: {
            ...mergedRow,
            name,
            description: mergedRow.description?.trim() ?? '',
            [PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET]: Boolean(
              mergedRow[PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET],
            ),
            [PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK]: Boolean(
              mergedRow[PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK],
            ),
            [PRODUCT_CATEGORY_FIELD_KEYS.HSN_CODE]:
              mergedRow[PRODUCT_CATEGORY_FIELD_KEYS.HSN_CODE]?.trim() ?? '',
          },
        }),
      );
    },
    [dispatch, store],
  );

  const gotoCategoriesMaster = useCallback(() => {
    navigate(CATEGORIES_MASTER_ROOT);
  }, [navigate]);

  const isLoading =
    status === 'loading' && !rowsByTab[PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP]?.length;

  return (
    <div className='flex w-full min-w-0 flex-col gap-6'>
      <nav
        aria-label='Breadcrumb'
        className='flex h-12 shrink-0 items-center gap-1.5 border-b border-stroke-soft-200'
      >
        <button
          type='button'
          onClick={gotoCategoriesMaster}
          className='label-small text-text-sub-500 transition-colors hover:text-text-main-900'
        >
          Categories Master
        </button>
        <RiArrowRightSLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
        <p className='label-small text-text-main-900'>Product</p>
      </nav>

      {loadError ? (
        <p className='px-4 py-3 paragraph-small text-error-base' role='alert'>
          {loadError}
        </p>
      ) : null}

      {!isLoading ? (
        <ProductCategoriesTreeTable
          rowsByTab={rowsByTab}
          onRemoveRow={handleRemoveRow}
          onAddCategoryGroup={handleAddCategoryGroup}
          onAddChild={handleAddChild}
          onUpdateRow={handleUpdateRow}
          onSaveRow={handleSaveRow}
          onNameChange={handleNameChange}
          onAssetTypeChange={handleAssetTypeChange}
          onHsnChange={handleHsnChange}
        />
      ) : null}

      <DeleteConfirmModal
        isOpen={Boolean(rowToDelete)}
        onOpenChange={handleDeleteModalOpenChange}
        title='Delete Category?'
        description={
          rowToDelete
            ? `Are you sure you want to delete "${rowToDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this category? This action cannot be undone.'
        }
        note='Delete all child categories before deleting this category.'
        onConfirm={handleConfirmDelete}
        isLoading={mutationStatus === 'loading'}
      />
    </div>
  );
};

export default ProductCategoriesPage;
