import BoardCommentsPanel from '@/pages/boards/comments/BoardCommentsPanel';

export default function BoardTaskCommentsPanel({
  taskId,
  onCommentAdded,
  sidebarTree = [],
  currentListId = null,
}) {
  return (
    <div className='h-full min-h-0'>
      <BoardCommentsPanel
        taskId={taskId}
        onCommentAdded={onCommentAdded}
        sidebarTree={sidebarTree}
        currentListId={currentListId}
      />
    </div>
  );
}
