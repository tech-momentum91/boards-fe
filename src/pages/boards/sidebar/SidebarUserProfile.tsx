import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiArrowRightSLine, RiLogoutBoxLine, RiNotification3Line, RiUserLine } from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

export type SidebarProfileUser = {
  full_name?: string;
  email?: string;
  profile_image?: string;
  user_image?: string;
} | null;

function getProfileInitials(fullName = ''): string {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) {
    return '';
  }

  const firstLetter = nameParts[0]?.[0]?.toUpperCase() ?? '';
  const lastLetter =
    nameParts.length > 1 ? (nameParts[nameParts.length - 1]?.[0]?.toUpperCase() ?? '') : '';

  return `${firstLetter}${lastLetter}`;
}

type SidebarUserProfileProps = {
  user: SidebarProfileUser;
  onLogout: () => void;
  className?: string;
};

export default function SidebarUserProfile({ user, onLogout, className }: SidebarUserProfileProps) {
  const navigate = useNavigate();
  const fullName = user?.full_name || '';
  const email = user?.email || '';
  const firstName = fullName.trim().split(/\s+/).filter(Boolean)[0] || 'User';
  const profileImage = user?.profile_image || user?.user_image;
  const hasProfileImage = Boolean(profileImage?.trim());
  const initials = useMemo(
    () => getProfileInitials(fullName || email),
    [email, fullName],
  );

  return (
    <div className={cn('w-full', className)}>
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <button
            type='button'
            className='flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-bg-white-0'
          >
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              {hasProfileImage ? (
                <Avatar.Root size={40}>
                  <Avatar.Image src={profileImage} alt={fullName || 'Avatar'} />
                </Avatar.Root>
              ) : (
                <Avatar.Root size={40} color='gray'>
                  <span className='text-label-md font-medium text-text-main-900'>
                    {initials || '?'}
                  </span>
                </Avatar.Root>
              )}

              <div className='flex min-w-0 flex-1 flex-col items-start justify-start gap-0.5'>
                <p className='w-full truncate text-label-sm text-text-main-900'>{firstName}</p>
                <p className='w-full truncate text-paragraph-xs text-text-sub-500'>
                  {email || 'Signed in'}
                </p>
              </div>
            </div>

            <span className='shrink-0 text-text-sub-500'>
              <RiArrowRightSLine size={20} />
            </span>
          </button>
        </Dropdown.Trigger>

        <Dropdown.Content side='top' align='start' className='min-w-[200px]'>
          <Dropdown.Group>
            <Dropdown.Item onClick={() => navigate('/boards/profile')}>
              <Dropdown.ItemIcon as={RiUserLine} />
              Profile
            </Dropdown.Item>
            <Dropdown.Item onClick={() => navigate('/boards/notification-settings')}>
              <Dropdown.ItemIcon as={RiNotification3Line} />
              Notification settings
            </Dropdown.Item>
            <Dropdown.Item onClick={onLogout}>
              <Dropdown.ItemIcon as={RiLogoutBoxLine} />
              Logout
            </Dropdown.Item>
          </Dropdown.Group>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}
