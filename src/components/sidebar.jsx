import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as Drawer from '@/components/ui/drawer';
import * as Avatar from '@/components/ui/avatar';
import * as CompactButton from '@/components/ui/compact-button';
import * as Dropdown from '@/components/ui/dropdown';
import logo from '@/assets/svgs/Layer.svg';
import closeLogo from '@/assets/images/Layer.png';
import NavItem from '@/components/ui/nav-item';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { logOutService } from '@/services/auth-service';
import { useDispatch, useSelector } from 'react-redux';
import { logoutSuccess } from '@/redux/authSlice';
import * as Badge from '@/components/ui/badge';
import { upperFirst } from 'lodash';
import {
  RiLogoutBoxLine,
  RiSettings2Line,
  RiLayoutGridLine,
  RiInbox2Line,
  RiSearchLine,
  RiTaskLine,
  RiHeadphoneLine,
  RiRecordCircleLine,
  RiCircleLine,
  RiArrowRightSLine,
  RiFileList3Line,
} from 'react-icons/ri';
import { buildSidebarSections } from '@/utils/sidebarPerm';
import { cn } from '@/utils/cn';
import * as Tooltip from '@/components/ui/tooltip';
import {
  fetchNotificationCountByTab,
  selectPrimaryNotificationCount,
} from '@/redux/notificationSlice';
import { setGlobalSearchOpen } from '@/redux/uiSlice';
import { getRole } from '@/utils/user-role-utils';
import CollapsibleSidebarItem from './ui/collapsible-sidebar-item';
import GlobalSearchInputButton from '@/components/global-search/global-search-input-button';
import { listDashboards } from '@/services/dashboard-master-service';

const DASHBOARD_SIDEBAR_KEY = 'dashboards';

function isDashboardMasterRoute(pathname) {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboards/') ||
    pathname.startsWith('/settings/dashboards')
  );
}

const PROFILE_SUPPORT_MENU_ITEMS = [
  { label: 'Feedback', path: '/support', icon: RiHeadphoneLine },
  { label: 'Release Note', path: '/release-note', icon: RiFileList3Line },
];

const Seperator = () => {
  return <div className='h-px mb-[12px] w-full bg-stroke-soft-200' />;
};

// Optimized NavItem with Tooltip wrapper
const NavItemWithTooltip = ({
  isDrawerOpen,
  children,
  tooltipContent,
  rightContent,
  ...navItemProps
}) => {
  const navItem = (
    <NavItem {...navItemProps} rightContent={rightContent}>
      {children}
    </NavItem>
  );
  if (isDrawerOpen) {
    return navItem;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className='w-full'>{navItem}</div>
      </Tooltip.Trigger>
      <Tooltip.Content>{tooltipContent}</Tooltip.Content>
    </Tooltip.Root>
  );
};

// Optimized Logo component with Pin Toggle
const LogoSection = ({ isEffectiveOpen, isPinned, togglePin }) => (
  <div className='h-12 w-full flex items-center justify-center'>
    {isEffectiveOpen ? (
      <div className='flex-1 text-label-lg text-text-strong-950'>
        <img src={logo} alt='Logo' />
      </div>
    ) : (
      <div className='flex-1 w-[100px] flex items-center justify-center h-[100px] text-label-lg text-text-strong-950'>
        <img src={closeLogo} alt='Logo' />
      </div>
    )}
    {isEffectiveOpen && (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className='shrink-0'>
            <CompactButton.Root
              variant='ghost'
              size='large'
              onClick={togglePin}
              className='cursor-pointer text-text-sub-500 hover:text-primary-base transition-colors duration-200'
            >
              <CompactButton.Icon
                className='w-5 h-5'
                as={isPinned ? RiRecordCircleLine : RiCircleLine}
              />
            </CompactButton.Root>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{isPinned ? 'Collapse on leave' : 'Pin Sidebar'}</Tooltip.Content>
      </Tooltip.Root>
    )}
  </div>
);

// Optimized User Profile section
const UserProfileSection = ({
  isDrawerOpen,
  user,
  handleLogout,
  handleNavigate,
  userSideBarPerm,
}) => {
  // Get initials: first letter of first name + last letter of last name
  const getProfileInitials = () => {
    const fullName = user?.full_name || '';
    if (!fullName) return '';

    const nameParts = fullName.trim().split(' ').filter(Boolean);
    if (nameParts.length === 0) return '';
    const firstName = nameParts[0];
    const lastName = nameParts.length == 1 ? '' : nameParts.at(-1);

    // Use lodash upperFirst to capitalize first letter, then get the first character
    const firstLetter = upperFirst(firstName)[0] || '';
    const lastLetter = lastName ? upperFirst(lastName)[0] || '' : '';

    return firstLetter + lastLetter;
  };

  const hasProfileImage = Boolean(
    (user?.profile_image || user?.user_image) &&
    (user?.profile_image || user?.user_image)?.trim() !== '',
  );

  return (
    <div className='w-full flex flex-col items-center justify-center gap-2'>
      <div className='rounded-[8px] w-full flex flex-col items-center justify-center gap-2'>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <div
              className={cn(
                'cursor-pointer hover:bg-bg-weak-100 flex items-center w-full gap-3',
                isDrawerOpen ? 'justify-between rounded-[8px]' : 'justify-center rounded-full',
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2',
                  isDrawerOpen ? 'w-full min-w-0' : 'justify-center',
                )}
              >
                {hasProfileImage ? (
                  <Avatar.Root size={48}>
                    <Avatar.Image src={user.profile_image || user.user_image} alt='Avatar' />
                  </Avatar.Root>
                ) : (
                  <Avatar.Root size={48} color='gray'>
                    <span className='text-label-lg font-medium text-text-main-900'>
                      {getProfileInitials()}
                    </span>
                  </Avatar.Root>
                )}
                {isDrawerOpen && (
                  <div className='gap-1 flex flex-col items-start justify-start flex-1 min-w-0'>
                    <div className='flex items-center gap-2 min-w-0 w-full'>
                      <p className='text-[14px] max-w-12.5 text-text-main-900 truncate w-full'>
                        {user?.full_name?.split(' ')[0]}
                      </p>

                      <Badge.Root
                        size='small'
                        className='whitespace-nowrap truncate'
                        variant='filled'
                        color='green'
                      >
                        <span className='truncate'>{getRole(userSideBarPerm)}</span>
                      </Badge.Root>
                    </div>

                    <p className='w-full text-ellipsis overflow-hidden whitespace-nowrap text-[12px] text-text-sub-500'>
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                )}
              </div>

              {isDrawerOpen && (
                <div className='text-text-sub-500 shrink-0 m-0.5'>
                  <RiArrowRightSLine size={20} />
                </div>
              )}
            </div>
          </Dropdown.Trigger>
          <Dropdown.Content side='top' align='start'>
            <Dropdown.Group>
              <Dropdown.Label>Support</Dropdown.Label>
              {PROFILE_SUPPORT_MENU_ITEMS.map((item) => (
                <Dropdown.Item key={item.path} onClick={() => handleNavigate(item.path)}>
                  <Dropdown.ItemIcon as={item.icon} />
                  {item.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Group>
            <Dropdown.Separator className='mx-0 my-1 h-px bg-stroke-soft-200' />
            <Dropdown.Group>
              <Dropdown.Item onClick={() => handleNavigate('/settings')}>
                <Dropdown.ItemIcon as={RiSettings2Line} />
                Settings
              </Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>
                <Dropdown.ItemIcon as={RiLogoutBoxLine} />
                Logout
              </Dropdown.Item>
            </Dropdown.Group>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
    </div>
  );
};

const Sidebar = ({ initialOpen = true }) => {
  const [isPinned, setIsPinned] = useState(initialOpen);
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverDisabled, setIsHoverDisabled] = useState(false);

  const isEffectiveOpen = isPinned || (isHovered && !isHoverDisabled);

  const handleMouseEnter = useCallback(() => {
    if (!isHoverDisabled) {
      setIsHovered(true);
    }
  }, [isHoverDisabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsHoverDisabled(false);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logout: authLogout } = useAuth();

  const { profileData } = useSelector((state) => state.profile);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const primaryNotificationCount = useSelector(selectPrimaryNotificationCount);

  useEffect(() => {
    dispatch(fetchNotificationCountByTab());
  }, [dispatch]);

  const [collapsedSections, setCollapsedSections] = useState({});
  const [dashboardNavItems, setDashboardNavItems] = useState([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);

  const isOnDashboardRoute = isDashboardMasterRoute(location.pathname);

  useEffect(() => {
    if (!isOnDashboardRoute) {
      setDashboardNavItems([]);
      setLoadingDashboards(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingDashboards(true);
    listDashboards()
      .then(({ dashboards }) => {
        if (cancelled) return;
        setDashboardNavItems(
          (dashboards ?? []).map((dashboard) => ({
            key: dashboard.dashboard_id,
            label: dashboard.dashboard_name,
            path: `/dashboards/${encodeURIComponent(dashboard.dashboard_id)}`,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setDashboardNavItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDashboards(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOnDashboardRoute]);

  // Helper function to check if a path is active (handles nested routes)
  const isPathActive = useCallback(
    (path) => {
      const currentPath = location.pathname;
      // Exact match
      if (currentPath === path) {
        return true;
      }
      // Check if current path starts with the item path followed by '/'
      // This handles nested routes like /clients/:id
      if (currentPath.startsWith(`${path}/`)) {
        return true;
      }
      return false;
    },
    [location.pathname],
  );
  // Parse sidebar data from API - new structure: { "Centers": ["Team Management"], "Spaces": [], ... }
  const sidebarSections = useMemo(() => {
    const sidebarData = userSideBarPerm?.data?.message?.sidebar;
    return buildSidebarSections(sidebarData);
  }, [userSideBarPerm]);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      setIsHovered(false);
      setIsHoverDisabled(true);
    },
    [navigate],
  );

  const togglePin = useCallback(() => {
    setIsPinned((previous) => {
      const next = !previous;
      if (!next) {
        setIsHoverDisabled(true);
      } else {
        setIsHoverDisabled(false);
      }
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logOutService();
      authLogout();
      dispatch(logoutSuccess());
      navigate('/login');
    } catch {
      authLogout();
      dispatch(logoutSuccess());
      navigate('/login');
    }
  }, [authLogout, dispatch, navigate]);

  const openGlobalSearch = useCallback(() => {
    dispatch(setGlobalSearchOpen(true));
    setIsPinned(false);
    setIsHovered(false);
    setIsHoverDisabled(true);
  }, [dispatch]);

  const bottomNavItems = useMemo(
    () => [
      {
        path: '/my-task',
        icon: <RiTaskLine size={20} />,
        label: 'My Task',
        tooltipContent: 'My Task',
      },
      {
        path: '/inbox',
        icon: <RiInbox2Line size={20} />,
        label: 'Inbox',
        tooltipContent: 'Inbox',
        rightContent:
          primaryNotificationCount > 0 ? (
            <span className='inline-flex min-w-5 items-center justify-center rounded-full bg-primary-base px-1.5 py-0.5 text-label-xs font-medium text-white'>
              {primaryNotificationCount > 99 ? '99+' : primaryNotificationCount}
            </span>
          ) : undefined,
      },
    ],
    [primaryNotificationCount],
  );

  return (
    <Tooltip.Provider delayDuration={300}>
      {/* Outer wrapper that pushes content only when pinned */}
      <div
        className={cn(
          'h-full shrink-0 transition-all duration-300 ease-in-out relative',
          isPinned ? 'w-[280px]' : 'w-[80px]',
        )}
      >
        {/* Inner container that floats absolute on hover when unpinned */}
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'h-full bg-bg-white-0 border-r border-stroke-soft-200 transition-all duration-300 ease-in-out flex flex-col z-40',
            isPinned
              ? 'w-[280px]'
              : isHovered && !isHoverDisabled
                ? 'absolute left-0 top-0 w-[280px] shadow-lg'
                : 'w-[80px]',
          )}
        >
          <Drawer.Header
            showCloseButton={false}
            className={`p-5 justify-between shrink-0 ${isEffectiveOpen ? 'flex flex-row' : 'flex flex-col'}`}
          >
            <LogoSection
              isEffectiveOpen={isEffectiveOpen}
              isPinned={isPinned}
              togglePin={togglePin}
            />
          </Drawer.Header>

          <Drawer.Body className='flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-5'>
            {isEffectiveOpen && (
              <div className='shrink-0 pb-2'>
                <GlobalSearchInputButton />
              </div>
            )}

            {/* Search option when collapsed */}
            <div className='shrink-0'>
              {!isEffectiveOpen && (
                <div className='w-full flex flex-col items-center gap-2'>
                  <NavItemWithTooltip
                    isDrawerOpen={isEffectiveOpen}
                    isActive={false}
                    onClick={openGlobalSearch}
                    leftIcon={<RiSearchLine size={20} />}
                    isOpen={isEffectiveOpen}
                    tooltipContent='Search'
                    className='text-nowrap'
                  >
                    Search
                  </NavItemWithTooltip>
                </div>
              )}
            </div>

            {/* Scrollable Main Navigation */}
            {/*
              min-h-[64px] (not min-h-0): on a short viewport, Drawer.Body's
              shrink-0 siblings (search box, pinned bottom items) claim their
              full natural height first, leaving this flex-1 child nothing -
              with min-h-0 it collapses to a literal 0px and the whole nav
              list disappears with no indication it's there. This floor
              guarantees at least a sliver stays visible (and scrollable) so
              the shadow above has something to signal against; Drawer.Body's
              own overflow-y-auto is the fallback if that still doesn't fit.
            */}
            <div
              className='flex-1 w-full overflow-y-auto overflow-x-hidden min-h-[64px]'
              style={{
                // Pure-CSS scroll shadow: fades in/out only while there's more
                // content to scroll in that direction (background-attachment
                // 'local' scrolls with the content, 'scroll' stays fixed to
                // the viewport, so the two gradients only overlap - and hide
                // the shadow - at the very top/bottom of the list).
                background:
                  'linear-gradient(var(--color-bg-white-0) 30%, transparent) center top, ' +
                  'linear-gradient(transparent, var(--color-bg-white-0) 70%) center bottom, ' +
                  'radial-gradient(farthest-side at 50% 0, var(--color-neutral-alpha-16), transparent) center top, ' +
                  'radial-gradient(farthest-side at 50% 100%, var(--color-neutral-alpha-16), transparent) center bottom',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 24px, 100% 24px, 100% 10px, 100% 10px',
                backgroundAttachment: 'local, local, scroll, scroll',
              }}
            >
              <div className='w-full flex flex-col items-center justify-center gap-2 py-2'>
                <CollapsibleSidebarItem
                  key={DASHBOARD_SIDEBAR_KEY}
                  label='Dashboard'
                  icon={<RiLayoutGridLine size={20} />}
                  parentPath='/dashboard'
                  collapsed={
                    collapsedSections[DASHBOARD_SIDEBAR_KEY] ??
                    !dashboardNavItems.some((item) => item.path && isPathActive(item.path))
                  }
                  handleCollapse={() =>
                    setCollapsedSections((previous) => ({
                      ...previous,
                      [DASHBOARD_SIDEBAR_KEY]: !(previous[DASHBOARD_SIDEBAR_KEY] ?? true),
                    }))
                  }
                  isDrawerOpen={isEffectiveOpen}
                  handleNavigate={handleNavigate}
                  isPathActive={isPathActive}
                  tooltipContent='Dashboard'
                >
                  {loadingDashboards
                    ? [{ key: 'loading', label: 'Loading…', path: null }]
                    : dashboardNavItems.length > 0
                      ? dashboardNavItems
                      : [{ key: 'empty', label: 'No dashboards yet', path: null }]}
                </CollapsibleSidebarItem>

                {sidebarSections.map((section) =>
                  section.hasChildren ? (
                    <CollapsibleSidebarItem
                      key={section.key}
                      label={section.label}
                      icon={section.icon}
                      collapsed={
                        collapsedSections[section.key] ??
                        !section.children.some((c) => c.path && isPathActive(c.path))
                      }
                      handleCollapse={() =>
                        setCollapsedSections((previous) => ({
                          ...previous,
                          [section.key]: !(previous[section.key] ?? true),
                        }))
                      }
                      isDrawerOpen={isEffectiveOpen}
                      handleNavigate={handleNavigate}
                      isPathActive={isPathActive}
                      tooltipContent={section.tooltipContent}
                      parentPath={section.path}
                    >
                      {section.children}
                    </CollapsibleSidebarItem>
                  ) : (
                    <NavItemWithTooltip
                      key={section.key}
                      isDrawerOpen={isEffectiveOpen}
                      isActive={isPathActive(section.path)}
                      onClick={() => handleNavigate(section.path)}
                      leftIcon={section.icon}
                      isOpen={isEffectiveOpen}
                      tooltipContent={section.tooltipContent}
                      className='text-nowrap'
                    >
                      {section.label}
                    </NavItemWithTooltip>
                  ),
                )}
              </div>
            </div>

            {/* My Task and Inbox - fixed at bottom */}
            <div className='shrink-0'>
              <div className='w-full flex flex-col items-center justify-center gap-2 pt-3'>
                {bottomNavItems.map((item) => (
                  <NavItemWithTooltip
                    key={item.path}
                    isDrawerOpen={isEffectiveOpen}
                    onClick={() => handleNavigate(item.path)}
                    isActive={isPathActive(item.path)}
                    leftIcon={item.icon}
                    rightContent={item.rightContent}
                    isOpen={isEffectiveOpen}
                    tooltipContent={item.tooltipContent}
                  >
                    {item.label}
                  </NavItemWithTooltip>
                ))}
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='flex-col shrink-0 px-5 pb-5'>
            <Seperator />
            <UserProfileSection
              userSideBarPerm={userSideBarPerm}
              isDrawerOpen={isEffectiveOpen}
              user={profileData}
              handleLogout={handleLogout}
              handleNavigate={handleNavigate}
            />
          </Drawer.Footer>
        </div>
      </div>
    </Tooltip.Provider>
  );
};

export default React.memo(Sidebar);
