import TaskViewDrawerCommon from './task-view-drawer-common';

// Main task view drawer component for Client Onboarding
const TaskViewDrawerOnboarding = (props) => {
  return <TaskViewDrawerCommon {...props} showRecurring={false} taskType='Client Onboarding' />;
};

export default TaskViewDrawerOnboarding;
