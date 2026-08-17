import TaskViewDrawerCommon from './task-view-drawer-common';

// Main task view drawer component for Client Engagement
const TaskViewDrawerEngagement = (props) => {
  return <TaskViewDrawerCommon {...props} showRecurring={true} taskType='Client Engagement' />;
};

export default TaskViewDrawerEngagement;
