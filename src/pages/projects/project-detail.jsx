import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePrefetchProjectAreas } from '@/hooks/use-project-areas';
import {
  RiArrowLeftSLine,
  RiBuildingLine,
  RiCalendar2Line,
  RiCalendarEventLine,
  RiCalendarLine,
  RiFileTextLine,
  RiGroupLine,
  RiLayout6Line,
  RiListCheck,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiPaletteLine,
  RiRuler2Line,
  RiShakeHandsLine,
  RiShape2Line,
  RiStackLine,
  RiTaskLine,
} from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import ErrorStateCard from '@/components/ui/error-state-card';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import { buildProjectGlobalLayoutUrl } from '@/components/projects/global-layout/project-global-layout-helpers';
import { buildProjectDetailHeader } from '@/components/projects/list/project-helpers';
import ProjectMembersPopover from '@/components/projects/list/project-members-popover';
import {
  ProjectDocumentsSection,
  ProjectAreasSection,
  ProjectGfcSection,
  ProjectThreeDSection,
  ProjectGraphicsSection,
  ProjectLayoutsSection,
  ProjectSnagsSection,
  ProjectTasksSection,
  ProjectSelectionSection,
  ProjectCollectionsSection,
} from '@/components/projects';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import ProjectDetailTabBar from '@/components/projects/project-detail-tab-bar';
import {
  PROJECT_DETAIL_MORE_TAB_DEFINITIONS,
  getProjectDetailAllSectionTabs,
} from '@/components/projects/constants';
import { useProjectDetailTabs } from '@/hooks/use-project-detail-tabs';
import {
  fetchProjectDetail,
  selectProjectDetail,
  selectProjectDetailError,
  selectProjectDetailLoading,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

const TAB_ICON_MAP = {
  'task-line': RiTaskLine,
  'shape-2-line': RiShape2Line,
  'layout-6-line': RiLayout6Line,
  'palette-line': RiPaletteLine,
  'box-3-line': RiStackLine,
  'file-text-line': RiFileTextLine,
  'shake-hands-line': RiShakeHandsLine,
  'calendar-line': RiCalendarLine,
  'calendar-event-line': RiCalendarEventLine,
  'money-dollar-circle-line': RiMoneyDollarCircleLine,
  'map-pin-line': RiMapPinLine,
};

const PROJECT_DETAIL_TAB_IDS = new Set(getProjectDetailAllSectionTabs().map((tab) => tab.id));

const COMING_SOON_TAB_IDS = new Set(['site_survey', 'dpr', 'wpr']);

function resolveProjectDetailTab(pathname, tabParam) {
  if (pathname.endsWith('/areas')) return 'areas';

  const normalizedTab = String(tabParam ?? '').trim();
  if (normalizedTab && PROJECT_DETAIL_TAB_IDS.has(normalizedTab)) {
    return normalizedTab;
  }

  return 'tasks';
}

export default function ProjectDetailPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  usePrefetchProjectAreas(id);

  const projectDetail = useSelector(selectProjectDetail);
  const isProjectDetailLoading = useSelector(selectProjectDetailLoading);
  const projectDetailError = useSelector(selectProjectDetailError);

  const { orderedTabs, pinnedIds, reorderTabs, togglePinTab } = useProjectDetailTabs();

  const tabFromUrl = useMemo(
    () => resolveProjectDetailTab(location.pathname, searchParams.get('tab')),
    [location.pathname, searchParams],
  );

  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);

      if (tab === 'areas') {
        navigate(`/projects/${encodeURIComponent(id)}/areas`, { replace: true });
        return;
      }

      if (location.pathname.endsWith('/areas')) {
        if (tab === 'tasks') {
          navigate(`/projects/${encodeURIComponent(id)}`, { replace: true });
        } else {
          navigate(`/projects/${encodeURIComponent(id)}?tab=${encodeURIComponent(tab)}`, {
            replace: true,
          });
        }
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      if (tab === 'tasks') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', tab);
      }

      const query = nextParams.toString();
      navigate(
        query
          ? `/projects/${encodeURIComponent(id)}?${query}`
          : `/projects/${encodeURIComponent(id)}`,
        {
          replace: true,
        },
      );
    },
    [id, location.pathname, navigate, searchParams],
  );

  useEffect(() => {
    if (!id) return;

    dispatch(fetchProjectDetail(id)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, id]);

  const handleRetryProjectDetail = () => {
    if (!id) return;
    dispatch(fetchProjectDetail(id)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  };

  const header = useMemo(() => buildProjectDetailHeader(projectDetail), [projectDetail]);

  const handleOpenGlobalLayout = useCallback(() => {
    const url = buildProjectGlobalLayoutUrl(id);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [id]);

  const handleRefreshProjectDetail = useCallback(async () => {
    if (!id) return;
    await dispatch(fetchProjectDetail(id)).unwrap();
  }, [dispatch, id]);

  const isHeaderLoading = isProjectDetailLoading && !projectDetail;
  const projectDetailErrorMessage = projectDetailError
    ? extractErrorMessage(projectDetailError, 'Failed to load project details')
    : null;

  if (!isProjectDetailLoading && projectDetailErrorMessage && !projectDetail) {
    return (
      <PageLayout
        showDefaultHeader={false}
        borderDivClassName='hidden'
        contentAreaClassName='bg-bg-white-0'
      >
        <div className='flex min-h-full flex-col px-6 py-8'>
          <ErrorStateCard
            title='Unable to load project'
            message={projectDetailErrorMessage}
            onRetry={handleRetryProjectDetail}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      showDefaultHeader={false}
      borderDivClassName='hidden'
      contentAreaClassName='bg-bg-white-0'
    >
      <div className='flex min-h-full flex-col'>
        <div className='flex items-center justify-between border-b border-stroke-soft-200 px-6 py-5'>
          <div className='flex min-w-0 items-center gap-4'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() => navigate('/projects')}
            >
              <Button.Icon as={RiArrowLeftSLine} />
            </Button.Root>
            <div className='flex min-w-0 flex-col gap-1'>
              <h1 className='truncate text-title-h7 text-text-main-900'>
                {isHeaderLoading ? 'Loading project…' : header.title}
              </h1>
              <div className='flex flex-wrap items-center gap-2 text-paragraph-sm text-text-sub-500'>
                <Badge.Root
                  variant='light'
                  color={header.stageColor}
                  size='small'
                  className='uppercase'
                >
                  {isHeaderLoading ? '—' : header.stageBadge}
                </Badge.Root>
                <span className='text-text-soft-400'>•</span>
                <span className='inline-flex items-center gap-1'>
                  <RiBuildingLine className='size-4' />
                  {isHeaderLoading ? '—' : header.locationLabel}
                </span>
                <span className='text-text-soft-400'>•</span>
                <span className='inline-flex items-center gap-1'>
                  <RiRuler2Line className='size-4' />
                  {isHeaderLoading ? '—' : header.carpetArea}
                </span>
                <span className='text-text-soft-400'>•</span>
                <span className='inline-flex items-center gap-1'>
                  <RiGroupLine className='size-4' />
                  {isHeaderLoading ? '—' : header.membersLabel}
                </span>
                <ProjectMembersPopover
                  project={projectDetail || { name: id, users: [] }}
                  projectId={id}
                  onUpdated={handleRefreshProjectDetail}
                >
                  <button
                    type='button'
                    className='text-label-sm text-primary-base underline disabled:opacity-50'
                    disabled={isHeaderLoading || !id}
                  >
                    View All
                  </button>
                </ProjectMembersPopover>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {id ? (
              <ProjectFollowersPopover
                projectId={id}
                scopeMode='project'
                referenceDoctype='Project'
                referenceName={id}
                section=''
                activityLabel='project'
              />
            ) : null}
            <ButtonGroup.Root size='xsmall'>
              <ButtonGroup.Item data-state='on'>
                <ButtonGroup.Icon as={RiListCheck} />
              </ButtonGroup.Item>
              <ButtonGroup.Item>
                <ButtonGroup.Icon as={RiCalendar2Line} />
              </ButtonGroup.Item>
              <ButtonGroup.Item
                aria-label='Open global layout'
                title='Global layout'
                onClick={handleOpenGlobalLayout}
              >
                <ButtonGroup.Icon as={RiStackLine} />
              </ButtonGroup.Item>
            </ButtonGroup.Root>
          </div>
        </div>

        <ProjectDetailTabBar
          tabs={orderedTabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabIconMap={TAB_ICON_MAP}
          pinnedIds={pinnedIds}
          onReorderTabs={reorderTabs}
          onTogglePinTab={togglePinTab}
        />

        <div className='flex flex-col gap-4 px-6 py-4'>
          {activeTab === 'layouts' ? (
            <ProjectLayoutsSection projectId={id} />
          ) : activeTab === 'areas' ? (
            <ProjectAreasSection projectId={id} />
          ) : activeTab === 'tasks' ? (
            <ProjectTasksSection projectId={id} />
          ) : activeTab === 'gfc' ? (
            <ProjectGfcSection projectId={id} />
          ) : activeTab === 'three_d' ? (
            <ProjectThreeDSection projectId={id} />
          ) : activeTab === 'graphics' ? (
            <ProjectGraphicsSection projectId={id} />
          ) : activeTab === 'documents' ? (
            <ProjectDocumentsSection projectId={id} />
          ) : activeTab === 'snags' ? (
            <ProjectSnagsSection projectId={id} />
          ) : activeTab === 'selection' ? (
            <ProjectSelectionSection projectId={id} />
          ) : activeTab === 'collections' ? (
            <ProjectCollectionsSection projectId={id} />
          ) : COMING_SOON_TAB_IDS.has(activeTab) ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>
                {PROJECT_DETAIL_MORE_TAB_DEFINITIONS[activeTab]?.label ?? activeTab} coming soon
              </p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                This section is not implemented yet.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}
