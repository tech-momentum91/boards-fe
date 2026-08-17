import TaskViewDrawerCommon from './task-view-drawer-common';

// Task view drawer for Partner Master tasks
const TaskViewDrawerPartnerMaster = (props) => {
  return <TaskViewDrawerCommon {...props} showRecurring={false} taskType='Partner Onboarding' />;
};

export default TaskViewDrawerPartnerMaster;
