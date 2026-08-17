import BoardTaskView from '../shared/BoardTaskView';

export default function TableView({
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
      layoutMode='table'
      sidebarTree={sidebarTree}
      onFavoriteTasksChange={onFavoriteTasksChange}
      onViewSettingsPersisted={onViewSettingsPersisted}
      onSaveViewAsNew={onSaveViewAsNew}
      statusTemplateVersion={statusTemplateVersion}
    />
  );
}
