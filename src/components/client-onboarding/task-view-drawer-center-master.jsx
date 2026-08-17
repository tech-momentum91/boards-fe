import TaskViewDrawerCommon from './task-view-drawer-common';

// Task view drawer for Center Master tasks
const TaskViewDrawerCenterMaster = (props) => {
  return <TaskViewDrawerCommon {...props} showRecurring={false} taskType='Center Preboarding' />;
};

export default TaskViewDrawerCenterMaster;
