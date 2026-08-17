import React from 'react';

// import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
// import ProposalBuilderClientLogoSection from '@/components/ui/proposal-builder/shell/proposal-builder-client-logo-section';
import ProposalBuilderPagesPanel from '@/components/ui/proposal-builder/shell/proposal-builder-pages-panel';
import ProposalBuilderSegmentedField from '@/components/ui/proposal-builder/shell/proposal-builder-segmented-field';
import { cn } from '@/utils/cn';
// import { normHex } from '@/components/ui/proposal-builder/theme/theme-contrast';

const PanelSectionLabel = ({ children, trailing }) => (
  <div className='mb-3 flex items-center justify-between'>
    <p className='text-subheading-2xs uppercase tracking-wider text-text-soft-400'>{children}</p>
    {trailing ? <span className='text-subheading-2xs text-text-soft-400'>{trailing}</span> : null}
  </div>
);

/**
 * Right sidebar — Figma proposal controls + pages (400px).
 */
const ProposalBuilderControlsPanel = ({
  previewMode,
  onPreviewModeChange,
  themeSource,
  onThemeSourceChange,
  websiteUrl,
  onWebsiteUrlChange,
  onWebsiteUrlCommit,
  templateId,
  templateOptions,
  onTemplateChange,
  websitePalette,
  themeColor,
  onThemeColorChange,
  themeLoading,
  hasWebsite,
  logoCandidates,
  clientLogoUrl,
  onSelectLogo,
  onUploadLogo,
  selectedCount,
  totalPages,
  pagesState,
  pageOrder,
  pagePlan,
  onTogglePage,
  onToggleAllPages,
  onTogglePageInstance,
  onReorderCity,
  onReorderCenter,
  onReorderPages,
  readOnly,
  sidebarDragPageRef,
  activePageId,
  onSelectPage,
  className,
}) => (
  <aside
    className={cn(
      'flex w-[400px] shrink-0 flex-col border-l border-stroke-soft-200 bg-bg-white-0',
      className,
    )}
  >
    <div className='flex-1 overflow-y-auto'>
      <div className='space-y-5 border-b border-stroke-soft-200 p-5'>
        <PanelSectionLabel>Proposal Controls</PanelSectionLabel>

        <ProposalBuilderSegmentedField
          label='Preview Mode'
          value={previewMode}
          options={[
            { value: 'web', label: 'Web' },
            { value: 'pdf', label: 'PDF' },
            { value: 'compare', label: 'Compare' },
          ]}
          onChange={onPreviewModeChange}
        />

        {/* Color theme + palette (disabled — fixed proposal primary #4FAE7C)
        <ProposalBuilderSegmentedField
          label='Color Theme'
          value={themeSource}
          disabled={themeLoading}
          options={[
            { value: 'devx', label: 'DevX' },
            { value: 'client', label: 'Client(ai)' },
          ]}
          onChange={onThemeSourceChange}
        />

        {themeSource === 'client' ? (
          <div className='flex flex-col gap-2'>
            <p className='text-label-sm font-semibold text-text-main-900'>Client Website</p>
            <Input.Root className='w-full' size='small'>
              <Input.Wrapper size='small'>
                <Input.Input
                  value={websiteUrl}
                  onChange={(event) => onWebsiteUrlChange(event.target.value)}
                  onBlur={onWebsiteUrlCommit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder='https://example.com (optional)'
                  disabled={readOnly || themeLoading}
                />
              </Input.Wrapper>
            </Input.Root>
            {!hasWebsite ? (
              <p className='text-xs text-text-soft-400'>
                Enter a website to load client brand colors.
              </p>
            ) : null}
          </div>
        ) : null}
        */}

        <div className='flex flex-col gap-2'>
          <p className='text-label-sm font-semibold text-text-main-900'>Template</p>
          <Select.Root
            value={templateId}
            onValueChange={onTemplateChange}
            disabled={readOnly || templateOptions.length === 0}
          >
            <Select.Trigger className='w-full'>
              <Select.Value placeholder='Select template' />
            </Select.Trigger>
            <Select.Content>
              {templateOptions.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        {/* Color palette picker (disabled — fixed proposal primary #4FAE7C)
        {websitePalette.length > 0 ? (
          <div className='flex flex-col gap-2'>
            <p className='text-label-sm font-semibold text-text-main-900'>
              {themeSource === 'devx' ? 'DevX Color Palette' : 'Client Color Palette'}
            </p>
            <div className='flex h-9 overflow-hidden rounded-lg border border-stroke-soft-200 shadow-regular-x-small'>
              {websitePalette.map((color) => {
                const selected = normHex(themeColor) === normHex(color);
                return (
                  <button
                    key={color}
                    type='button'
                    title={color}
                    className='relative min-w-0 flex-1'
                    style={{ backgroundColor: color }}
                    onClick={() => onThemeColorChange(color)}
                    disabled={readOnly}
                  >
                    {selected ? (
                      <span className='absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-static-white shadow-sm' />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        */}

        {themeLoading ? (
          <p className='text-paragraph-x-small text-text-soft-400'>Loading brand theme…</p>
        ) : null}

        {/* Client logo from website scrape (disabled with color theme)
        {themeSource === 'client' && hasWebsite ? (
          <ProposalBuilderClientLogoSection
            logoCandidates={logoCandidates}
            selectedLogoUrl={clientLogoUrl}
            onSelectLogo={onSelectLogo}
            onUploadLogo={onUploadLogo}
            themeLoading={themeLoading}
            readOnly={readOnly}
          />
        ) : null}
        */}
      </div>

      <div className='p-5'>
        <ProposalBuilderPagesPanel
          selectedCount={selectedCount}
          totalPages={totalPages}
          pagesState={pagesState}
          pageOrder={pageOrder}
          pagePlan={pagePlan}
          onTogglePage={onTogglePage}
          onToggleAllPages={onToggleAllPages}
          onTogglePageInstance={onTogglePageInstance}
          onReorderCity={onReorderCity}
          onReorderCenter={onReorderCenter}
          onReorderPages={onReorderPages}
          readOnly={readOnly}
          sidebarDragPageRef={sidebarDragPageRef}
          activePageId={activePageId}
          onSelectPage={onSelectPage}
        />
      </div>
    </div>
  </aside>
);

export default ProposalBuilderControlsPanel;
