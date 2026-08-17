import BoardTaskView from '../shared/BoardTaskView';

export default function CalendarView({
  list,
  taskView,
  sidebarTree = [],
  onFavoriteTasksChange,
  onViewSettingsPersisted,
  onSaveViewAsNew,
  statusTemplateVersion = 0,
}) {
  return (
    <BoardTaskView
      list={list}
      taskView={taskView}
      layoutMode='calendar'
      sidebarTree={sidebarTree}
      onFavoriteTasksChange={onFavoriteTasksChange}
      onViewSettingsPersisted={onViewSettingsPersisted}
      onSaveViewAsNew={onSaveViewAsNew}
      statusTemplateVersion={statusTemplateVersion}
    />
  );
}
