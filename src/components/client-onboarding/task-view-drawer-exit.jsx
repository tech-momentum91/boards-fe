import TaskViewDrawerCommon from './task-view-drawer-common';

// Main task view drawer component for Client Exit
const TaskViewDrawerExit = (props) => {
  return <TaskViewDrawerCommon {...props} showRecurring={false} taskType='Client Exiting' />;
};

export default TaskViewDrawerExit;
