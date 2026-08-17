import React, { useEffect, useMemo, useState } from 'react';

import ProjectDrawerCommentLayoutTabs from '@/components/projects/shared/project-drawer-comment-layout-tabs';
import TaskComments from '@/components/clients-management/task-comments';
import ProjectViewLayoutPanel from '@/components/projects/shared/project-view-layout-panel';
import {
  buildProjectTaskLayoutPreview,
  resolveProjectTaskMarkerCoordinates,
} from '@/components/projects/tasks/project-task-helpers';

/**
 * Right column for project task view drawers — comments + read-only layout.
 *
 * @param {{
 *   task?: object | null,
 *   markerColor?: string,
 * }} props
 */
export default function ProjectTaskViewRightPanel({ task = null, markerColor = '#6E3FF3' }) {
  const [activeTab, setActiveTab] = useState('layout');

  const layoutPreview = useMemo(() => buildProjectTaskLayoutPreview(task), [task]);
  const markerCoordinates = useMemo(() => resolveProjectTaskMarkerCoordinates(task), [task]);
  const hasLayout = Boolean(layoutPreview?.layout_image);
  const taskId = task?.id || task?.name;

  useEffect(() => {
    setActiveTab(hasLayout ? 'layout' : 'comments');
  }, [hasLayout, taskId]);

  return (
    <ProjectDrawerCommentLayoutTabs
      value={activeTab}
      onValueChange={setActiveTab}
      layoutContent={
        hasLayout ? (
          <ProjectViewLayoutPanel
            layout={layoutPreview}
            selectedAreaId={task?.area ?? ''}
            floorLabel={task?.floor ?? layoutPreview?.floor ?? ''}
            markerColor={markerColor}
            markerCoordinates={markerCoordinates}
          />
        ) : (
          <div className='flex min-h-[320px] flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-text-sub-600'>
            No layout saved for this task.
          </div>
        )
      }
      commentsContent={<TaskComments taskName={taskId} />}
    />
  );
}
