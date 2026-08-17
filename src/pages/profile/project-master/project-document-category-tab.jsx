import React, { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import {
  createProjectDocumentCategory,
  deleteProjectDocumentCategory,
  fetchProjectDocumentCategoryList,
  updateProjectDocumentCategory,
} from '@/redux/projectMasterSlice';
import { PROJECT_DOCUMENT_CATEGORY_COLUMN_WIDTHS } from '@/pages/profile/project-master/project-master.constants';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';
import {
  documentCategoryFieldValuesEqual,
  getDocumentCategoryRowValue,
} from '@/pages/profile/project-master/project-master-helpers';

function CategoryColumnHeader({ label }) {
  return <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>;
}

function CategoryInlineInput({ defaultValue, placeholder, onCommit, className }) {
  return (
    <Input.Root variant='borderless' size='xsmall' className={className}>
      <Input.Wrapper>
        <Input.Input
          key={defaultValue}
          type='text'
          defaultValue={defaultValue}
          placeholder={placeholder}
          onBlur={(event) => onCommit?.(event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

export default function ProjectDocumentCategoryTab() {
  const dispatch = useDispatch();
  const { list, create } = useSelector((state) => state.projectMaster.documentCategories);
  const isDeleting = useSelector((state) => state.projectMaster.delete.isLoading);
  const { data: categoryList, isLoading } = list;
  const categories = categoryList?.results ?? [];
  const isCreating = create.isLoading;

  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [draftCategory, setDraftCategory] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const loadCategories = useCallback(
    async (keyword = debouncedSearchTerm) => {
      try {
        await dispatch(
          fetchProjectDocumentCategoryList({
            keyword,
            page: 1,
            limit_page_length: 20,
          }),
        ).unwrap();
      } catch (error) {
        const statusCode = error?.status_code ?? error?.exc_type;
        if (statusCode === 404) return;
        showErrorToast(extractErrorMessage(error));
      }
    },
    [debouncedSearchTerm, dispatch],
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleFieldUpdate = useCallback(
    async (rowName, fieldName, value) => {
      const category = categories.find((row) => row.name === rowName);
      if (!rowName || !category) return;

      const originalValue = getDocumentCategoryRowValue(category, fieldName);
      if (documentCategoryFieldValuesEqual(fieldName, originalValue, value)) return;

      const nextCategory =
        fieldName === 'category' ? value : getDocumentCategoryRowValue(category, 'category');
      const nextDescription =
        fieldName === 'description' ? value : getDocumentCategoryRowValue(category, 'description');

      try {
        await dispatch(
          updateProjectDocumentCategory({
            name: rowName,
            category: nextCategory,
            description: nextDescription,
          }),
        ).unwrap();
        await loadCategories();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [categories, dispatch, loadCategories],
  );

  const submitNewCategory = useCallback(async () => {
    const category = draftCategory.trim();
    const description = draftDescription.trim();
    if (!category || isCreating) return;

    try {
      await dispatch(createProjectDocumentCategory({ category, description })).unwrap();
      showSuccessToast('Category created successfully');
      setIsAdding(false);
      setDraftCategory('');
      setDraftDescription('');
      await loadCategories();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, draftCategory, draftDescription, isCreating, loadCategories]);

  const handleConfirmDelete = useCallback(async () => {
    const categoryId = pendingDelete?.id;
    if (!categoryId) return;

    try {
      await dispatch(deleteProjectDocumentCategory(categoryId)).unwrap();
      showSuccessToast('Category deleted successfully');
      setPendingDelete(null);
      await loadCategories();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, loadCategories, pendingDelete?.id]);

  return (
    <div className='flex w-full flex-col gap-4'>
      <Input.Root size='xsmall' className='w-full sm:w-[276px]'>
        <Input.Wrapper>
          <Input.Icon as={RiSearchLine} />
          <Input.Input
            placeholder='Search here...'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='w-full overflow-x-auto'>
        {isLoading ? (
          <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
            Loading categories…
          </div>
        ) : (
          <Table.Root variant='compact' className='w-full'>
            <Table.Header>
              <Table.Row>
                <Table.Head className={cn(PROJECT_DOCUMENT_CATEGORY_COLUMN_WIDTHS.name)}>
                  <CategoryColumnHeader label='Name' />
                </Table.Head>
                <Table.Head className={cn(PROJECT_DOCUMENT_CATEGORY_COLUMN_WIDTHS.description)}>
                  <CategoryColumnHeader label='Description' />
                </Table.Head>
                <Table.Head className={cn(PROJECT_DOCUMENT_CATEGORY_COLUMN_WIDTHS.actions)}>
                  <span className='sr-only'>Actions</span>
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body spacing={4}>
              {categories.map((category) => {
                const rowName = category.name;
                const categoryName = getDocumentCategoryRowValue(category, 'category');
                const description = getDocumentCategoryRowValue(category, 'description');

                return (
                  <React.Fragment key={rowName}>
                    <Table.Row>
                      <Table.Cell>
                        <CategoryInlineInput
                          defaultValue={categoryName}
                          placeholder='Enter category name'
                          onCommit={(value) => handleFieldUpdate(rowName, 'category', value)}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <CategoryInlineInput
                          defaultValue={description}
                          placeholder='Enter description'
                          onCommit={(value) => handleFieldUpdate(rowName, 'description', value)}
                        />
                      </Table.Cell>
                      <Table.Cell className='text-right'>
                        <ProjectMasterTableDeleteButton
                          ariaLabel={`Delete ${categoryName || rowName}`}
                          onClick={() =>
                            setPendingDelete({
                              id: rowName,
                              label: categoryName || rowName,
                            })
                          }
                        />
                      </Table.Cell>
                    </Table.Row>
                    <Table.RowDivider dividerClassName='bg-transparent' />
                  </React.Fragment>
                );
              })}

              {isAdding ? (
                <>
                  <Table.Row>
                    <Table.Cell>
                      <Input.Root variant='borderless' size='xsmall'>
                        <Input.Wrapper>
                          <Input.Input
                            value={draftCategory}
                            placeholder='Enter category name'
                            onChange={(event) => setDraftCategory(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                event.currentTarget.blur();
                              }
                            }}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </Table.Cell>
                    <Table.Cell>
                      <Input.Root variant='borderless' size='xsmall'>
                        <Input.Wrapper>
                          <Input.Input
                            value={draftDescription}
                            placeholder='Enter description'
                            onChange={(event) => setDraftDescription(event.target.value)}
                            onBlur={submitNewCategory}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                event.currentTarget.blur();
                              }
                            }}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </Table.Cell>
                    <Table.Cell />
                  </Table.Row>
                  <Table.RowDivider dividerClassName='bg-transparent' />
                </>
              ) : (
                <Table.Row>
                  <Table.Cell colSpan={3} className=''>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='small'
                      disabled={isCreating}
                      onClick={() => {
                        setIsAdding(true);
                        setDraftCategory('');
                        setDraftDescription('');
                      }}
                      className='h-9 w-full flex justify-start gap-3 text-label-sm border-dashed border-stroke-sub-300 bg-bg-weak-100 text-text-sub-500 '
                    >
                      <Button.Icon as={RiAddLine} className='rounded-full bg-white' />
                      Add Category
                    </Button.Root>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title='Delete category?'
        description={
          pendingDelete?.label
            ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.`
            : 'Are you sure you want to delete this category? This action cannot be undone.'
        }
        item={pendingDelete}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
