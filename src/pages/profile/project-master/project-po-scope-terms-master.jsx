import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiDeleteBin6Line } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import ProjectPoScopeTemplateModal from '@/pages/profile/project-master/project-po-scope-template-modal';
import ProjectPoScopePaymentTermsTemplateModal from '@/pages/profile/project-master/project-po-scope-payment-terms-template-modal';
import ProjectPoScopePaymentTermsTemplateRow from '@/pages/profile/project-master/project-po-scope-payment-terms-template-row';
import {
  createPaymentMilestone,
  doMilestonesTotalHundred,
} from '@/pages/profile/project-master/project-po-scope-payment-milestones-editor';
import {
  createPoScopeTemplate,
  deletePoScopeTemplate,
  fetchPoScopeTerms,
  updatePoScopeTemplate,
} from '@/services/po-scope-terms-service';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

const SAVE_DEBOUNCE_MS = 700;

function CategorySidebarItem({ category, isActive, onSelect }) {
  return (
    <button
      type='button'
      onClick={() => onSelect(category.id)}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-lg p-2 text-left transition-colors',
        isActive ? 'bg-bg-white-0 shadow-regular-sm' : 'hover:bg-bg-white-0/60',
      )}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-label-sm',
          isActive ? 'text-text-strong-950' : 'text-text-sub-500',
        )}
      >
        {category.label}
      </span>
      {isActive ? (
        <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-bg-weak-100'>
          <RiArrowRightSLine className='size-5 text-text-sub-500' />
        </span>
      ) : (
        <span className='inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 px-1.5 text-label-xs text-text-sub-500'>
          {category.templates.length}
        </span>
      )}
    </button>
  );
}

function TemplateRow({ template, isExpanded, onToggle, onUpdateField, onDelete }) {
  return (
    <div
      className={cn(
        'group overflow-hidden rounded-10 border bg-bg-weak-50 shadow-regular-xs transition-colors',
        isExpanded
          ? 'border-stroke-sub-300 shadow-regular-sm'
          : 'border-stroke-soft-200 hover:border-stroke-sub-300',
      )}
    >
      <div className='flex items-center justify-between pr-2.5'>
        <button
          type='button'
          onClick={() => onToggle(template.id)}
          aria-expanded={isExpanded}
          className='flex h-9 min-w-0 flex-1 items-center gap-2 py-2 pl-2.5 text-left'
        >
          <RiArrowDownSLine
            className={cn(
              'size-5 shrink-0 text-text-sub-500 transition-transform duration-200',
              !isExpanded && '-rotate-90',
            )}
          />
          <span className='min-w-0 flex-1 truncate text-label-sm text-text-sub-500'>
            {template.name || 'Untitled Template'}
          </span>
        </button>

        <button
          type='button'
          onClick={(event) => {
            event.stopPropagation();
            onDelete(template);
          }}
          aria-label={`Delete ${template.name || 'template'}`}
          className={cn(
            'shrink-0 text-text-soft-400 transition hover:text-red-base',
            isExpanded
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        >
          <RiDeleteBin6Line className='size-5' />
        </button>
      </div>

      {isExpanded ? (
        <div className='flex flex-col gap-4 border-t border-stroke-soft-200 bg-bg-white-0 p-4'>
          <div className='flex w-full flex-col gap-1'>
            <Label.Root>Name</Label.Root>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  value={template.name ?? ''}
                  placeholder='Enter template name'
                  onChange={(event) => onUpdateField(template.id, 'name', event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex w-full flex-col gap-1'>
            <Label.Root>Description</Label.Root>
            <div className='w-full overflow-hidden rounded-10 border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
              <SimpleEditor
                embed
                value={template.content}
                onChange={(value) => onUpdateField(template.id, 'content', value)}
                className='h-[240px]'
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function findTemplateInCategories(categories, templateId) {
  for (const category of categories) {
    const template = category.templates.find((item) => item.id === templateId);
    if (template) {
      return { category, template };
    }
  }
  return null;
}

export default function ProjectPoScopeTermsMaster({ onBackClick }) {
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [expandedTemplateIds, setExpandedTemplateIds] = useState(() => new Set());
  const [expandedPaymentTemplateIds, setExpandedPaymentTemplateIds] = useState(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoriesRef = useRef(categories);
  const saveTimersRef = useRef({});
  const saveVersionsRef = useRef({});

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timerId) => {
        clearTimeout(timerId);
      });
    };
  }, []);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetchPoScopeTerms();
      const nextCategories = Array.isArray(response?.categories) ? response.categories : [];
      setCategories(nextCategories);
      setActiveCategoryId((previous) => {
        if (previous && nextCategories.some((category) => category.id === previous)) {
          return previous;
        }
        return nextCategories[0]?.id ?? '';
      });
    } catch (error) {
      setLoadError(error);
      showErrorToast(extractErrorMessage(error, 'Failed to load PO Scope & Terms'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? categories[0] ?? null,
    [activeCategoryId, categories],
  );

  const isPaymentTermsCategory = Boolean(activeCategory?.is_payment_terms);

  const replaceTemplateInState = useCallback((oldTemplateId, nextTemplate) => {
    const newTemplateId = nextTemplate.id ?? oldTemplateId;

    setCategories((previous) =>
      previous.map((category) => ({
        ...category,
        templates: category.templates.map((template) =>
          template.id === oldTemplateId
            ? { ...template, ...nextTemplate, id: newTemplateId }
            : template,
        ),
      })),
    );

    if (newTemplateId === oldTemplateId) return;

    const migrateExpanded = (setter) => {
      setter((previous) => {
        if (!previous.has(oldTemplateId)) return previous;
        const next = new Set(previous);
        next.delete(oldTemplateId);
        next.add(newTemplateId);
        return next;
      });
    };
    migrateExpanded(setExpandedTemplateIds);
    migrateExpanded(setExpandedPaymentTemplateIds);

    if (saveVersionsRef.current[oldTemplateId] != null) {
      saveVersionsRef.current[newTemplateId] = saveVersionsRef.current[oldTemplateId];
      delete saveVersionsRef.current[oldTemplateId];
    }
  }, []);

  const scheduleTemplateSave = useCallback(
    (templateId) => {
      const existingTimer = saveTimersRef.current[templateId];
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const nextVersion = (saveVersionsRef.current[templateId] ?? 0) + 1;
      saveVersionsRef.current[templateId] = nextVersion;

      saveTimersRef.current[templateId] = setTimeout(async () => {
        const found = findTemplateInCategories(categoriesRef.current, templateId);
        if (!found) return;

        const { category, template } = found;

        // Skip API until ERPNext can accept the schedule (portions must total 100%).
        if (category.is_payment_terms && !doMilestonesTotalHundred(template.milestones ?? [])) {
          delete saveTimersRef.current[templateId];
          return;
        }

        try {
          const saved = await updatePoScopeTemplate({
            name: templateId,
            category: category.id,
            template_name: template.name ?? '',
            content: template.content ?? '',
            milestones: category.is_payment_terms ? (template.milestones ?? []) : undefined,
          });

          if (saveVersionsRef.current[templateId] !== nextVersion) {
            return;
          }

          if (saved) {
            replaceTemplateInState(templateId, {
              id: saved.id ?? templateId,
              name: saved.name ?? template.name,
              content: saved.content ?? template.content,
              milestones: saved.milestones ?? template.milestones ?? [],
            });
          }
        } catch (error) {
          showErrorToast(extractErrorMessage(error, 'Failed to save template'));
        } finally {
          delete saveTimersRef.current[templateId];
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [replaceTemplateInState],
  );

  const handleSelectCategory = useCallback((categoryId) => {
    setActiveCategoryId(categoryId);
  }, []);

  const handleOpenCreateTemplate = useCallback(() => {
    setIsTemplateModalOpen(true);
  }, []);

  const handleToggleTemplate = useCallback((templateId) => {
    setExpandedTemplateIds((previous) => {
      const next = new Set(previous);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }, []);

  const handleUpdateTemplateField = useCallback(
    (templateId, field, value) => {
      setCategories((previous) =>
        previous.map((category) => ({
          ...category,
          templates: category.templates.map((template) =>
            template.id === templateId ? { ...template, [field]: value } : template,
          ),
        })),
      );
      scheduleTemplateSave(templateId);
    },
    [scheduleTemplateSave],
  );

  const handleTogglePaymentTemplate = useCallback((templateId) => {
    setExpandedPaymentTemplateIds((previous) => {
      const next = new Set(previous);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }, []);

  const updatePaymentTemplate = useCallback(
    (templateId, updater) => {
      setCategories((previous) =>
        previous.map((category) =>
          category.is_payment_terms
            ? {
                ...category,
                templates: category.templates.map((template) =>
                  template.id === templateId ? updater(template) : template,
                ),
              }
            : category,
        ),
      );
      scheduleTemplateSave(templateId);
    },
    [scheduleTemplateSave],
  );

  const handleUpdateMilestone = useCallback(
    (templateId, milestoneId, field, value) => {
      updatePaymentTemplate(templateId, (template) => ({
        ...template,
        milestones: (template.milestones ?? []).map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, [field]: value } : milestone,
        ),
      }));
    },
    [updatePaymentTemplate],
  );

  const handleAddMilestone = useCallback(
    (templateId) => {
      const milestone = createPaymentMilestone();
      updatePaymentTemplate(templateId, (template) => ({
        ...template,
        milestones: [...(template.milestones ?? []), milestone],
      }));
      setExpandedPaymentTemplateIds((previous) => {
        const next = new Set(previous);
        next.add(templateId);
        return next;
      });
    },
    [updatePaymentTemplate],
  );

  const handleDeleteMilestone = useCallback(
    (templateId, milestoneId) => {
      updatePaymentTemplate(templateId, (template) => {
        const current = template.milestones ?? [];
        if (current.length <= 1) return template;
        return {
          ...template,
          milestones: current.filter((milestone) => milestone.id !== milestoneId),
        };
      });
    },
    [updatePaymentTemplate],
  );

  const handleSaveTemplate = useCallback(
    async ({ name, content, milestones }) => {
      if (!activeCategory?.id || isSavingTemplate) {
        throw new Error('Unable to save template right now');
      }

      setIsSavingTemplate(true);
      try {
        const created = await createPoScopeTemplate({
          category: activeCategory.id,
          template_name: name,
          content: content ?? '',
          milestones: activeCategory.is_payment_terms ? (milestones ?? []) : [],
        });

        if (!created?.id) {
          throw new Error('Template was created but no id was returned');
        }

        setCategories((previous) =>
          previous.map((category) =>
            category.id === activeCategory.id
              ? {
                  ...category,
                  templates: [
                    ...category.templates,
                    {
                      id: created.id,
                      name: created.name ?? name,
                      content: created.content ?? content ?? '',
                      milestones: created.milestones ?? [],
                    },
                  ],
                }
              : category,
          ),
        );

        if (activeCategory.is_payment_terms) {
          setExpandedPaymentTemplateIds((previous) => {
            const next = new Set(previous);
            next.add(created.id);
            return next;
          });
        } else {
          setExpandedTemplateIds((previous) => {
            const next = new Set(previous);
            next.add(created.id);
            return next;
          });
        }

        showSuccessToast('Template created successfully');
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to create template'));
        throw error;
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [activeCategory, isSavingTemplate],
  );

  const handleConfirmDelete = useCallback(async () => {
    const templateId = pendingDelete?.id;
    if (!templateId || isDeleting) return;

    const existingTimer = saveTimersRef.current[templateId];
    if (existingTimer) {
      clearTimeout(existingTimer);
      delete saveTimersRef.current[templateId];
    }

    setIsDeleting(true);
    try {
      await deletePoScopeTemplate(templateId, activeCategoryId);

      setCategories((previous) =>
        previous.map((category) => ({
          ...category,
          templates: category.templates.filter((template) => template.id !== templateId),
        })),
      );
      setExpandedTemplateIds((previous) => {
        if (!previous.has(templateId)) return previous;
        const next = new Set(previous);
        next.delete(templateId);
        return next;
      });
      setExpandedPaymentTemplateIds((previous) => {
        if (!previous.has(templateId)) return previous;
        const next = new Set(previous);
        next.delete(templateId);
        return next;
      });
      setPendingDelete(null);
      showSuccessToast('Template deleted successfully');
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'Failed to delete template'));
    } finally {
      setIsDeleting(false);
    }
  }, [activeCategoryId, isDeleting, pendingDelete?.id]);

  return (
    <div className='flex h-full min-h-0 w-full flex-col'>
      <div className='flex shrink-0 items-center gap-2 border-b border-stroke-soft-200 pb-2'>
        <div
          onClick={onBackClick}
          className='cursor-pointer text-label-sm text-text-sub-500 transition hover:text-text-strong-950'
        >
          Projects Master
        </div>
        <RiArrowRightSLine className='size-4 text-text-sub-500' />
        <div className='text-label-sm text-text-strong-950'>PO Scope &amp; Terms</div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col lg:flex-row'>
        <aside className='w-full shrink-0 border-r border-stroke-soft-200 bg-bg-weak-100 lg:w-[240px]'>
          <nav className='flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-4'>
            {categories.map((category) => (
              <CategorySidebarItem
                key={category.id}
                category={category}
                isActive={category.id === activeCategory?.id}
                onSelect={handleSelectCategory}
              />
            ))}
          </nav>
        </aside>

        <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-5'>
          {isLoading ? (
            <div className='flex min-h-[240px] items-center justify-center'>
              <p className='text-paragraph-sm text-text-sub-500'>Loading templates…</p>
            </div>
          ) : loadError ? (
            <div className='flex min-h-[240px] flex-col items-center justify-center gap-3 text-center'>
              <p className='text-label-sm text-text-strong-950'>
                Failed to load PO Scope &amp; Terms
              </p>
              <p className='max-w-sm text-paragraph-sm text-text-sub-500'>
                {extractErrorMessage(loadError, 'Please try again.')}
              </p>
              <Button.Root size='small' variant='neutral' mode='stroke' onClick={loadCategories}>
                Retry
              </Button.Root>
            </div>
          ) : (
            <>
              <div className='flex items-start justify-between gap-6'>
                <div className='flex flex-col gap-1'>
                  <h2 className='text-label-sm text-text-strong-950'>{activeCategory?.label}</h2>
                  <p className='max-w-[420px] text-paragraph-xs text-text-sub-500'>
                    {activeCategory?.description}
                  </p>
                </div>
                <Button.Root
                  size='small'
                  className='shrink-0 gap-1'
                  onClick={handleOpenCreateTemplate}
                  disabled={!activeCategory?.id || isSavingTemplate}
                >
                  <Button.Icon as={RiAddLine} />
                  Add Template
                </Button.Root>
              </div>

              <div className='flex flex-col gap-2'>
                {(activeCategory?.templates?.length ?? 0) > 0 ? (
                  activeCategory.templates.map((template) =>
                    isPaymentTermsCategory ? (
                      <ProjectPoScopePaymentTermsTemplateRow
                        key={template.id}
                        template={template}
                        isExpanded={expandedPaymentTemplateIds.has(template.id)}
                        onToggle={handleTogglePaymentTemplate}
                        onDelete={setPendingDelete}
                        onUpdateMilestone={handleUpdateMilestone}
                        onAddMilestone={handleAddMilestone}
                        onDeleteMilestone={handleDeleteMilestone}
                      />
                    ) : (
                      <TemplateRow
                        key={template.id}
                        template={template}
                        isExpanded={expandedTemplateIds.has(template.id)}
                        onToggle={handleToggleTemplate}
                        onUpdateField={handleUpdateTemplateField}
                        onDelete={setPendingDelete}
                      />
                    ),
                  )
                ) : (
                  <div className='flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
                    <p className='text-label-sm text-text-strong-950'>No templates yet</p>
                    <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                      Add a template to get started.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ProjectPoScopePaymentTermsTemplateModal
        open={isPaymentTermsCategory && isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        mode='create'
        onSave={handleSaveTemplate}
      />

      <ProjectPoScopeTemplateModal
        open={!isPaymentTermsCategory && isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        categoryLabel={activeCategory?.label}
        onSave={handleSaveTemplate}
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
        title='Delete template?'
        description={
          pendingDelete?.name
            ? `Are you sure you want to delete "${pendingDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this template? This action cannot be undone.'
        }
        item={pendingDelete}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
