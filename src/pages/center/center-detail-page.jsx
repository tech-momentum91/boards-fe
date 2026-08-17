import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import AICenterModal from '@/components/AI/AICenterModal';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiBox2Fill,
  RiBuildingLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiFile2Fill,
  RiGroupFill,
  RiPencilLine,
  RiFundsLine,
  RiFundsFill,
  RiFileList3Line,
  RiFileList3Fill,
  RiSettings4Line,
  RiSettings4Fill,
  RiCloseFill,
  RiTicketFill,
} from 'react-icons/ri';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import PageLayout from '@/components/page-layout';
import { useWidgetVisibility } from '@/hooks/use-widget-visibility';
import WidgetVisibilityDropdown from '@/components/ui/widget-visibility-dropdown';
import * as Button from '@/components/ui/button';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import { getStatusOptions } from '@/api/dynamic-status';
import * as Input from '@/components/ui/input';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { getCenterDetailsThunk, updateCenterThunk } from '@/redux/centerSlice';
import { hasModulePermission, isAdminRole } from '@/utils/user-role-utils';
import { CENTER_DETAIL_TAB_READ_MODULE, CENTER_MAIN_TAB_DEFS } from '@/constants/constants';
import CenterDetailFloors from '@/components/centers-management/center-detail-floors';
import CenterDetailParkingFloors from '@/components/centers-management/center-detail-parking-floors';
import CenterDetailEmergenceyContact from '@/components/centers-management/center-detail-emergency-contact';
import CenterDetailBilling from '@/components/centers-management/center-detail-billing';
import CenterViewLandlord from '@/components/centers-management/center-view-content/center-view-landlord';
import CenterViewTeamAssociated from '@/components/centers-management/center-view-content/center-view-team-associateed';
import CenterViewComplianceDocument from '@/components/centers-management/center-view-content/center-view-compliance-document';
import CenterViewSpace from '@/components/centers-management/center-view-content/center-view-space';
import CenterDetailClientsTab from '@/components/centers-management/center-detail-clients-tab';
import CenterDetailBasicDetails from '@/components/centers-management/center-detail-basic-details';
import CenterDetailAboutSidebar from '@/components/centers-management/center-detail-about-sidebar';
import CenterDetailOverview from '@/components/centers-management/center-detail-overview';
import CenterDetailMarketInsigths from '@/components/centers-management/center-detail-market-insights';
import CenterDetailNewsSignal from '@/components/centers-management/center-detail-news-signal';
import CenterDetailFunding from '@/components/centers-management/center-detail-funding';
import CenterDetailTicketsTab from '@/components/centers-management/center-detail-tickets-tab';
import CenterDetailOpexTab from '@/components/centers-management/center-detail-opex-tab';
import CenterDetailPnLTab from '@/components/centers-management/center-detail-pnl-tab';
import CenterDetailPreboardingTab from '@/components/centers-management/center-detail-preboarding/center-detail-preboarding-tab';
import CreateNewSpaceModal from '@/components/space-management/create-new-space';
import TicketCreateDrawer from '@/components/ticket-management/ticket-create-drawer';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import CenterDetailConfiguration from '@/components/centers-management/center-view-configuration/center-detail-configuration';
import { getRoleMaxLimit } from '@/utils/center-configuration-storage';

// StatItem component for the stats strip
const StatItem = ({ icon: Icon, label, value, iconColor, bgColor, onClick, popoverContent }) => {
  return (
    <div className='flex items-center gap-3 px-6 min-w-0'>
      <div
        className='flex p-2.5 items-center justify-center rounded-full bg-bg-weak-50'
        style={{ backgroundColor: bgColor }}
      >
        <Icon style={{ fill: iconColor }} size={20} />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='text-[10px] text-wrap font-semibold uppercase tracking-wider text-text-soft-400'>
          {label}
        </div>
        <div className='flex items-center gap-2'>
          <div className='text-paragraph-sm font-medium text-text-strong-950 truncate'>{value}</div>
          {popoverContent ? (
            <Popover.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Popover.Trigger asChild>
                    <button
                      className='text-text-sub-500 hover:text-text-main-900 transition-colors'
                      aria-label='View details'
                    >
                      <RiEyeLine size={16} />
                    </button>
                  </Popover.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Content variant='light' side='bottom'>
                  {popoverContent}
                </Tooltip.Content>
              </Tooltip.Root>
              <Popover.Content align='start' side='buttom' className='p-6 min-w-[240px]'>
                <div className='flex flex-col gap-5'>
                  <div className='flex items-center justify-between'>
                    <span className='text-[10px] font-semibold uppercase tracking-wider text-text-soft-400'>
                      Team Stats
                    </span>
                    <Popover.Close className='text-text-soft-400 hover:text-text-strong-950 transition-colors'>
                      <RiCloseFill size={18} />
                    </Popover.Close>
                  </div>
                  {popoverContent}
                </div>
              </Popover.Content>
            </Popover.Root>
          ) : (
            onClick && (
              <button
                onClick={onClick}
                className='text-text-sub-500 hover:text-text-main-900 transition-colors'
                aria-label='View details'
              >
                <RiEyeLine size={16} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const DividerY = () => <div className='w-px self-stretch bg-stroke-soft-200' aria-hidden='true' />;

const VALID_TABS = [
  'about-center',
  'preboarding',
  'tickets',
  'opex',
  'billing',
  'space',
  'clients',
  'teams',
  'summary',
  'p&l',
  'configuration',
  'landlords',
];

const CenterDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('about-center');
  const pendingTabRef = useRef(null);
  const [aboutSubTab, setAboutSubTab] = useState('basic-details');
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isCreateTicketDrawerOpen, setIsCreateTicketDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');

  // --- City-required guard ---------------------------------------------------
  // Checks whether the center's city field is populated.
  // When empty, blocks all page interactions (tabs, buttons, navigation) and
  // forces the user to stay on About Center > Basic Details to fill it in.

  const canViewPnL = isAdminRole(userSideBarPerm);

  const canReadTab = useCallback(
    (tabValue) => {
      if (tabValue === 'p&l' && !canViewPnL) return false;
      if (!userSideBarPerm?.data?.message?.role) return true;
      const moduleName = CENTER_DETAIL_TAB_READ_MODULE[tabValue];
      if (moduleName == null) return true;
      return (
        hasModulePermission(userSideBarPerm, moduleName, 'read') ||
        hasModulePermission(userSideBarPerm, moduleName, 'write')
      );
    },
    [userSideBarPerm, canViewPnL],
  );

  const tabOptions = useMemo(
    () => CENTER_MAIN_TAB_DEFS.filter((tab) => canReadTab(tab.value)),
    [canReadTab],
  );

  const [showAI, setShowAI] = useState(false);
  const [centerStatusOptions, setCenterStatusOptions] = useState([]);

  // Widget visibility management for stats strip
  const { widgetVisibility, toggleWidget, hideAllWidgets, WIDGET_KEYS } =
    useWidgetVisibility('center-detail-widgets');
  const [isWidgetVisibilityOpen, setIsWidgetVisibilityOpen] = useState(false);

  const {
    data: centerDetails,
    isLoading,
    error,
  } = useSelector((state) => state.center.centerDetails);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Center', field: 'status' });
        if (!cancelled) setCenterStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setCenterStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Tracks when the basic-details component clears city locally (e.g. after state change).
   * This is needed because the Redux store may still hold the old city value.
   */
  const [cityClearedLocally, setCityClearedLocally] = useState(false);

  const handleCityStatusChange = useCallback((isCityRequired) => {
    setCityClearedLocally(isCityRequired);
  }, []);

  /** True when the user has edit permissions and the loaded center has no city value, or city was cleared locally. */
  const isCityMissing = useMemo(
    () => canWrite && (cityClearedLocally || (centerDetails && !centerDetails.city?.trim())),
    [canWrite, centerDetails, cityClearedLocally],
  );

  /**
   * Guard helper – call before any page interaction.
   * Returns `true` when city is present (action may proceed).
   * Returns `false` (and shows a toast) when city is missing.
   */
  const guardCityRequired = useCallback(() => {
    if (!isCityMissing) return true;
    showErrorToast('City is required. Please select a city in Basic Details before proceeding.');
    // Force the user back to About Center > Basic Details
    if (activeTab !== 'about-center') {
      setActiveTab('about-center');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tab');
          return next;
        },
        { replace: true },
      );
    }
    if (aboutSubTab !== 'basic-details') {
      setAboutSubTab('basic-details');
    }
    return false;
  }, [isCityMissing, activeTab, aboutSubTab, setSearchParams]);

  const handleTabChange = useCallback(
    (tab) => {
      if (!guardCityRequired()) return;
      pendingTabRef.current = tab;
      setActiveTab(tab);
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('tab', tab);
          if (tab === 'about-center') {
            next.set('aboutSubTab', aboutSubTab || 'basic-details');
          } else {
            next.delete('aboutSubTab');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, guardCityRequired, aboutSubTab],
  );

  /** Guarded about-sub-tab change – blocks switching away from basic-details when city is missing. */
  const handleAboutSubTabChange = useCallback(
    (subTab) => {
      if (subTab !== 'basic-details' && !guardCityRequired()) return;
      setActiveTab('about-center');
      setAboutSubTab(subTab);
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'about-center');
          next.set('aboutSubTab', subTab);
          return next;
        },
        { replace: true },
      );
    },
    [guardCityRequired, setSearchParams],
  );

  const handleEditName = useCallback(() => {
    if (!guardCityRequired()) return;
    setEditedName(centerDetails?.center_name || '');
    setIsEditingName(true);
  }, [centerDetails, guardCityRequired]);

  const handleSaveName = useCallback(async () => {
    const trimmedName = editedName.trim();

    // If empty, revert to original name
    if (!trimmedName) {
      setEditedName(centerDetails?.center_name || '');
      setIsEditingName(false);
      return;
    }

    // If unchanged, just exit edit mode
    if (trimmedName === centerDetails?.center_name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await dispatch(
        updateCenterThunk({
          center_id: centerDetails?.name,
          payload: { center_name: trimmedName },
        }),
      ).unwrap();

      showSuccessToast('Center name updated successfully');
      setIsEditingName(false);

      // Refresh center details
      if (centerDetails?.name) {
        dispatch(getCenterDetailsThunk(centerDetails.name));
      }
    } catch (error) {
      showErrorToast(error || 'Failed to update center name');
      // Revert to original name on error
      setEditedName(centerDetails?.center_name || '');
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  }, [editedName, centerDetails, dispatch]);

  const handleCancelEdit = useCallback(() => {
    setEditedName(centerDetails?.center_name || '');
    setIsEditingName(false);
  }, [centerDetails]);

  // Sync active tab and summary drawer from URL (load, back/forward, shared links)
  useEffect(() => {
    if (tabOptions.length === 0) return;

    const raw = searchParams.get('tab');
    const rawSubTab = searchParams.get('aboutSubTab');

    // Redirect ?tab=documents links to About Center -> Documents subtab
    if (raw === 'documents') {
      setActiveTab('about-center');
      setAboutSubTab('documents');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'about-center');
          next.set('aboutSubTab', 'documents');
          return next;
        },
        { replace: true },
      );
      return;
    }

    const urlTab = raw || 'about-center';
    if (!VALID_TABS.includes(urlTab)) return;

    // Force tab to 'about-center' if city is missing
    const resolved = isCityMissing
      ? 'about-center'
      : tabOptions.some((t) => t.value === urlTab)
        ? urlTab
        : tabOptions[0].value;

    setActiveTab((current) => (current === resolved ? current : resolved));

    if (resolved === 'about-center') {
      const validSubTabs = [
        'basic-details',
        'floors',
        'parking-floors',
        'emergency-contacts',
        'documents',
      ];
      const resolvedSubTab = isCityMissing
        ? 'basic-details'
        : rawSubTab && validSubTabs.includes(rawSubTab)
          ? rawSubTab
          : 'basic-details';

      setAboutSubTab((current) => (current === resolvedSubTab ? current : resolvedSubTab));
    }
  }, [searchParams, tabOptions, setSearchParams, isCityMissing]);

  // If city is missing, force tab to about-center > basic-details immediately on mount/load
  useEffect(() => {
    if (isCityMissing) {
      setActiveTab('about-center');
      setAboutSubTab('basic-details');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tab');
          return next;
        },
        { replace: true },
      );
    }
  }, [isCityMissing, setSearchParams]);

  // If user doesn't have access to P&L, don't allow staying on that tab
  useEffect(() => {
    if (!canViewPnL && activeTab === 'p&l') {
      setActiveTab('about-center');
    }
  }, [canViewPnL, activeTab]);

  // Fetch center details when component mounts or id changes (avoid re-fetch on unrelated detail updates)
  useEffect(() => {
    if (!id) return;
    setCityClearedLocally(false);
    const loadedName = centerDetails?.name;
    if (!loadedName || String(loadedName) !== String(id)) {
      dispatch(getCenterDetailsThunk(id));
    }
  }, [dispatch, id, centerDetails?.name]);

  // Calculate stats from center details
  const stats = useMemo(() => {
    if (!centerDetails) return [];

    // Calculate available spaces from space details if available
    // For now, use placeholder or calculate from space data
    const availableSpaces =
      centerDetails.available_spaces_count ??
      centerDetails.space_count ??
      centerDetails.space_details?.filter((s) => s.status === 'Available')?.length ??
      0;

    const roleCounts = Object.entries(
      (centerDetails.associated_teams || []).reduce((acc, curr) => {
        const role = curr.role || 'Other';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {}),
    );

    const teamStatsContent = (
      <div
        className='flex flex-col gap-4'
        style={{
          maxHeight: roleCounts.length > 11 ? '200px' : 'none',
          overflowY: roleCounts.length > 11 ? 'auto' : 'visible',
          paddingRight: roleCounts.length > 11 ? '8px' : '0',
        }}
      >
        {(centerDetails.associated_teams || []).length > 0 ? (
          roleCounts.map(([role, count]) => {
            const maxLimit = getRoleMaxLimit(centerDetails?.name, role);
            const countLabel = maxLimit ? `${count}/${maxLimit}` : `${count}`;
            return (
              <div key={role} className='flex items-center justify-between gap-6 shrink-0'>
                <span className='paragraph-small text-text-sub-500'>{role}</span>
                <div className='flex h-6 px-2 items-center justify-center rounded-full bg-warning-lighter text-[11px] font-bold text-warning-base'>
                  {countLabel}
                </div>
              </div>
            );
          })
        ) : (
          <span className='paragraph-xs text-text-soft-400 italic'>No team members assigned</span>
        )}
      </div>
    );

    return [
      {
        key: 'availableSpaces',
        label: 'AVAILABLE SPACES',
        value: String(availableSpaces),
        icon: RiBox2Fill,
        iconColor: '#1F87AD',
        bgColor: '#E6F4FA',
      },
      {
        key: 'openTickets',
        label: 'OPEN TICKETS',
        value: String(centerDetails.open_tickets_count ?? centerDetails.ticket_count ?? 0),
        icon: RiTicketFill,
        iconColor: '#5A36BF',
        bgColor: '#EEEBFF',
      },
      {
        key: 'expiringDocuments',
        label: 'EXPIRING DOCUMENTS',
        value: String(centerDetails.expiring_documents_count ?? centerDetails.document_count ?? 0),
        icon: RiFile2Fill,
        iconColor: '#C2540A',
        bgColor: '#FEF3EB',
        onClick: () => {
          handleAboutSubTabChange('documents');
        },
      },
      {
        key: 'team',
        label: 'TEAM',
        value: `${centerDetails.team_members_count ?? centerDetails.team_count ?? 0} Members`,
        icon: RiGroupFill,
        iconColor: '#1F87AD',
        bgColor: '#E6F4FA',
        popoverContent: teamStatsContent,
        onClick: () => {
          handleTabChange('teams');
        },
      },
    ];
  }, [centerDetails, handleTabChange]);

  const centerName = centerDetails?.center_name || 'Center';
  const centerStatus = centerDetails?.status || 'Active';
  const headerCenterStatusColor =
    centerStatusOptions.find((o) => String(o.value) === String(centerStatus || '').trim())?.color ??
    centerDetails?.status_color ??
    centerDetails?.statusColor ??
    null;

  if (isLoading && !centerDetails) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full w-full items-center justify-center'>
          <div className='text-paragraph-md text-text-sub-500'>Loading center details...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full w-full items-center justify-center'>
          <div className='text-paragraph-md text-text-error-500'>
            Error loading center details. Please try again.
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full w-full flex-col'>
        {/* Header */}
        <div className='pt-5 pb-[14px] pl-6 border-b pr-8 w-full border-stroke-soft-200 bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex items-center gap-4'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back'
                onClick={() => {
                  if (!guardCityRequired()) return;
                  navigate('/centers');
                }}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>

              <div className='min-w-0 flex flex-col gap-1.5'>
                {isEditingName ? (
                  <div className='flex items-center gap-2'>
                    <Input.Root size='small' className='min-w-[250px] max-w-[400px]'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveName();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelEdit();
                            }
                          }}
                          disabled={isSavingName}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    <div className='flex items-center gap-1'>
                      <Button.Root
                        variant='primary'
                        size='small'
                        onClick={handleSaveName}
                        disabled={isSavingName || !editedName.trim()}
                        aria-label='Save name'
                      >
                        <Button.Icon as={RiCheckLine} />
                      </Button.Root>
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='small'
                        onClick={handleCancelEdit}
                        disabled={isSavingName}
                        aria-label='Cancel editing'
                      >
                        <Button.Icon as={RiCloseLine} />
                      </Button.Root>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`text-label-md text-text-strong-950 truncate transition-colors group flex items-center gap-2 ${
                      canWrite ? 'cursor-pointer hover:text-primary-base' : ''
                    }`}
                    onClick={canWrite ? handleEditName : undefined}
                    role={canWrite ? 'button' : undefined}
                    tabIndex={canWrite ? 0 : undefined}
                  >
                    {centerName}
                    {canWrite && (
                      <RiPencilLine
                        className='opacity-0 group-hover:opacity-100 transition-opacity text-text-sub-500'
                        size={14}
                      />
                    )}
                  </div>
                )}
                <div className='flex items-center gap-2 min-w-0'>
                  <StatusColorPill
                    value={centerStatus}
                    color={headerCenterStatusColor}
                    className='max-w-full'
                  />
                </div>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1'
                onClick={() => {
                  if (!guardCityRequired()) return;
                  setIsCreateSpaceModalOpen(true);
                }}
              >
                <Button.Icon as={RiAddLine} />
                Add Space
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1'
                onClick={() => {
                  if (!guardCityRequired()) return;
                  setIsCreateTicketDrawerOpen(true);
                }}
              >
                <Button.Icon as={RiAddLine} />
                Create Ticket
              </Button.Root>
              <button
                className='ai-trigger-btn'
                onClick={() => {
                  if (!guardCityRequired()) return;
                  setShowAI(true);
                }}
              >
                <Sparkles size={14} />
                Ask AI
              </button>
              <WidgetVisibilityDropdown
                open={isWidgetVisibilityOpen}
                onOpenChange={setIsWidgetVisibilityOpen}
                widgetVisibility={widgetVisibility}
                onToggleWidget={toggleWidget}
                onHideAll={hideAllWidgets}
                tooltipContent={<p>Widget Visibility</p>}
                size='small'
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='flex-1 w-full border-stroke-soft-200 overflow-hidden flex flex-col min-h-0'>
          {/* Stats strip (fixed height) */}
          {widgetVisibility[WIDGET_KEYS.STATS] && (
            <div className='py-4 border-stroke-soft-200 bg-bg-white-0 overflow-hidden shrink-0'>
              <div className='flex items-stretch'>
                {stats.map((s, index) => (
                  <React.Fragment key={s.key}>
                    <div className='flex-1 min-w-0'>
                      <StatItem
                        icon={s.icon || RiBuildingLine}
                        label={s.label}
                        value={s.value}
                        iconColor={s.iconColor}
                        bgColor={s.bgColor}
                        onClick={s.onClick}
                        popoverContent={s.popoverContent}
                      />
                    </div>
                    {index < stats.length - 1 ? <DividerY /> : null}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Main tabs (fills remaining height) */}
          <div className='flex-1 min-h-0'>
            <TabMenuHorizontal.Root
              value={activeTab}
              onValueChange={handleTabChange}
              className='flex flex-col h-full min-h-0'
            >
              <TabMenuHorizontal.List wrapperClassName='w-full shrink-0' className='px-4'>
                {tabOptions.map((tab) => {
                  const IconComponent = activeTab === tab.value ? tab.iconFill : tab.iconLine;
                  return (
                    <TabMenuHorizontal.Trigger key={tab.value} value={tab.value}>
                      <TabMenuHorizontal.Icon as={IconComponent} />
                      {tab.label}
                    </TabMenuHorizontal.Trigger>
                  );
                })}
              </TabMenuHorizontal.List>

              {/* About Center Tab */}
              <TabMenuHorizontal.Content value='about-center' className='flex-1 min-h-0'>
                <div className='flex h-full min-h-0'>
                  <CenterDetailAboutSidebar
                    value={aboutSubTab}
                    onValueChange={handleAboutSubTabChange}
                  />

                  <div className='flex-1 min-h-0 overflow-y-auto py-4 px-6'>
                    {centerDetails ? (
                      aboutSubTab === 'basic-details' ? (
                        <CenterDetailBasicDetails
                          centerDetails={centerDetails}
                          onCityStatusChange={handleCityStatusChange}
                        />
                      ) : aboutSubTab === 'floors' ? (
                        <CenterDetailFloors />
                      ) : aboutSubTab === 'parking-floors' ? (
                        <CenterDetailParkingFloors />
                      ) : aboutSubTab === 'emergency-contacts' ? (
                        <CenterDetailEmergenceyContact centerDetails={centerDetails} />
                      ) : aboutSubTab === 'documents' ? (
                        <CenterViewComplianceDocument />
                      ) : aboutSubTab === 'overview' ? (
                        <CenterDetailOverview />
                      ) : aboutSubTab === 'market-sights' ? (
                        <CenterDetailMarketInsigths />
                      ) : aboutSubTab === 'news-signal' ? (
                        <CenterDetailNewsSignal />
                      ) : (
                        <CenterDetailFunding />
                      )
                    ) : (
                      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                        Loading center details...
                      </div>
                    )}
                  </div>
                </div>
              </TabMenuHorizontal.Content>

              {/* Tickets Tab */}
              <TabMenuHorizontal.Content
                value='tickets'
                className='flex-1 min-h-0 overflow-hidden flex flex-col pt-4 pb-0 px-6'
              >
                {activeTab === 'tickets' ? <CenterDetailTicketsTab /> : null}
              </TabMenuHorizontal.Content>

              {/* Preboarding Tab */}
              <TabMenuHorizontal.Content
                value='preboarding'
                className='flex-1 min-h-0 overflow-hidden'
              >
                <CenterDetailPreboardingTab />
              </TabMenuHorizontal.Content>

              {/* OPEX Tab */}
              <TabMenuHorizontal.Content
                value='opex'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <CenterDetailOpexTab />
              </TabMenuHorizontal.Content>

              {/* Billing Tab */}
              <TabMenuHorizontal.Content
                value='billing'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <CenterDetailBilling centerId={centerDetails?.name} />
              </TabMenuHorizontal.Content>

              {/* P&L Tab */}
              {canViewPnL && (
                <TabMenuHorizontal.Content
                  value='p&l'
                  className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
                >
                  <CenterDetailPnLTab />
                </TabMenuHorizontal.Content>
              )}

              {/* Space Tab */}
              <TabMenuHorizontal.Content
                value='space'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <CenterViewSpace />
              </TabMenuHorizontal.Content>

              {/* Clients Tab */}
              <TabMenuHorizontal.Content
                value='clients'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <CenterDetailClientsTab centerId={centerDetails?.name} />
              </TabMenuHorizontal.Content>

              {/* Teams Tab */}
              <TabMenuHorizontal.Content
                value='teams'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <CenterViewTeamAssociated
                  centerName={centerDetails?.center_name}
                  centerId={centerDetails?.name}
                />
              </TabMenuHorizontal.Content>

              {/* Landlords Tab */}
              {canReadTab('landlords') && (
                <TabMenuHorizontal.Content
                  value='landlords'
                  className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
                >
                  <CenterViewLandlord />
                </TabMenuHorizontal.Content>
              )}

              <TabMenuHorizontal.Content value='configuration' className='flex-1 min-h-0'>
                <CenterDetailConfiguration centerId={centerDetails?.name} />
              </TabMenuHorizontal.Content>
            </TabMenuHorizontal.Root>
          </div>
        </div>

        {/* Create Space Modal */}
        {centerDetails && (
          <CreateNewSpaceModal
            centerDetails={centerDetails}
            disabledCenter={true}
            open={isCreateSpaceModalOpen}
            setOpen={setIsCreateSpaceModalOpen}
            onSuccess={() => {
              // Refresh center details after successful space creation
              if (centerDetails?.name) {
                dispatch(getCenterDetailsThunk(centerDetails.name));
              }
            }}
          />
        )}

        {/* Create Ticket Drawer */}
        <TicketCreateDrawer
          open={isCreateTicketDrawerOpen}
          onOpenChange={setIsCreateTicketDrawerOpen}
          initialCenter={centerDetails?.name || null}
          onSuccess={() => {
            // Refresh center details after successful ticket creation
            if (centerDetails?.name) {
              dispatch(getCenterDetailsThunk(centerDetails.name));
            }
          }}
        />

        {showAI && (
          <AICenterModal
            centerId={centerDetails?.name}
            centerName={centerName}
            onClose={() => setShowAI(false)}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default CenterDetailPage;
