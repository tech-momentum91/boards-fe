import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/pages/boards/sidebar/Sidebar';
import BoardHeader from '@/pages/boards/layout/BoardHeader';
import BoardsSidebarShell from '@/pages/boards/layout/BoardsSidebarShell';
import BoardsGlobalSearchModal from '@/pages/boards/layout/BoardsGlobalSearchModal';
import useBoardsSidebarCollapsed from '@/pages/boards/hooks/useBoardsSidebarCollapsed';
import { buildBoardsNavigationPath } from '@/pages/boards/utils/boards-navigation';
import ComingSoonMessage from '@/components/coming-soon-message';

const INBOX_HEADER_ITEM = { label: 'Inbox' };

export default function BoardsInboxPage() {
  const navigate = useNavigate();
  const [sidebarTree, setSidebarTree] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useBoardsSidebarCollapsed();

  const handleSelectItem = useCallback(
    (item: { id?: string; type?: string }) => {
      navigate(buildBoardsNavigationPath(item));
    },
    [navigate],
  );

  return (
    <div className='flex h-dvh min-w-0 overflow-hidden'>
      <div className='flex h-full min-h-0 min-w-0 flex-1'>
        <BoardsSidebarShell collapsed={isSidebarCollapsed}>
          <Sidebar
            activeId={null}
            expandedIds={expandedIds}
            onExpandedIdsChange={setExpandedIds}
            onSelectItem={handleSelectItem}
            onTreeLoaded={setSidebarTree}
          />
        </BoardsSidebarShell>

        <div className='flex min-h-0 min-w-0 flex-1 flex-col bg-bg-white-0'>
          <BoardHeader
            selectedItem={INBOX_HEADER_ITEM}
            onOpenSearch={() => setIsGlobalSearchOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />

          <BoardsGlobalSearchModal
            open={isGlobalSearchOpen}
            onOpenChange={setIsGlobalSearchOpen}
            sidebarTree={sidebarTree}
          />

          <ComingSoonMessage />
        </div>
      </div>
    </div>
  );
}
