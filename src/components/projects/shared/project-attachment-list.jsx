import React from 'react';

import AttachmentList from '@/components/ui/attachment-list';
import { normalizeProjectAttachmentForList } from '@/components/projects/shared/project-attachment-display-utils';

/** Project task drawer attachment list with project-specific name/url normalization. */
export default function ProjectAttachmentList(props) {
  return <AttachmentList {...props} normalizeAttachmentFn={normalizeProjectAttachmentForList} />;
}
