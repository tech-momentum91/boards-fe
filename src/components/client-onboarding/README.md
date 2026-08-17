# Client Onboarding Task View Drawer

A comprehensive drawer component for viewing and editing client onboarding tasks with inline editing, scrollable attachments, and table-like field layout.

## Features

- **Inline Editing**: Edit all task fields directly in the drawer with optimistic updates
- **Table-like Layout**: Status, priority, assignee, and duration displayed in a clean, organized format using `FieldRow` components
- **Scrollable Attachments**: Multiple images/files can be scrolled horizontally with left/right navigation buttons
- **Drag & Drop**: Support for dragging and dropping files to upload attachments
- **Optimistic Updates**: Local state updates immediately while API calls happen in the background
- **Tag Management**: Add and remove tags dynamically
- **File Upload**: Support for multiple file uploads with size validation (50 MB limit)

## Usage

```jsx
import TaskViewDrawer from '@/components/client-onboarding/task-view-drawer';
// or
import { TaskViewDrawer } from '@/components/client-onboarding';

function MyComponent() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleFieldUpdate = async (taskId, fieldName, value) => {
    // Handle field update - call your API here
    console.log('Updating:', { taskId, fieldName, value });

    // Refetch task data after update
    await refetchTaskData(taskId);
  };

  const handleRefreshTask = async () => {
    // Refetch task data (e.g., after file upload)
    await refetchTaskData(selectedTask.name);
  };

  return (
    <>
      <Button onClick={() => setIsDrawerOpen(true)}>View Task</Button>

      <TaskViewDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onFieldUpdate={handleFieldUpdate}
        onRefresh={handleRefreshTask}
        permissions={{ canEdit: true }}
      />
    </>
  );
}
```

## Props

| Prop            | Type       | Required | Default             | Description                                                            |
| --------------- | ---------- | -------- | ------------------- | ---------------------------------------------------------------------- |
| `isOpen`        | `boolean`  | No       | `false`             | Controls drawer visibility                                             |
| `onClose`       | `function` | Yes      | -                   | Callback when drawer is closed                                         |
| `task`          | `object`   | No       | `null`              | Task object containing task data                                       |
| `onFieldUpdate` | `function` | No       | -                   | Callback when a field is updated: `(taskId, fieldName, value) => void` |
| `onRefresh`     | `function` | No       | -                   | Callback to refresh task data (e.g., after file upload)                |
| `permissions`   | `object`   | No       | `{ canEdit: true }` | Permissions object with `canEdit` property                             |

## Task Object Structure

The `task` prop should have the following structure:

```javascript
{
  name: 'TASK-001',                    // Task ID
  subject: 'Complete Company Setup',   // Alternative task identifier
  task_name: 'Complete Company Setup', // Task title
  description: 'Description text...',  // Task description
  status: 'Active',                    // Status: 'Active' or 'Inactive'
  priority: 'High',                    // Priority: 'Low', 'Medium', 'High'
  duration: 5,                         // Duration in days
  assigned_to: ['user@example.com'],   // Array of assignee emails
  assignee: [                          // Alternative assignee format
    { user: 'user@example.com' }
  ],
  tags: ['tag1', 'tag2'],             // Array of tags
  attachments: [                       // Array of attachments
    {
      name: 'file-id',
      file_name: 'document.pdf',
      file_url: 'https://...',
      file_size: 1024000,
      creation: '2024-01-05T10:00:00'
    }
  ]
}
```

## Field Layout

The drawer displays fields in a table-like format using `FieldRow` components:

1. **Status** - Badge with color coding (Active: green, Inactive: gray)
2. **Priority** - Badge with color coding (Low: green, Medium: yellow, High: red)
3. **Assignee** - Multi-select dropdown with avatar display
4. **Duration** - Number input with "days" suffix

## Attachment Features

- **Image Preview**: Automatic preview for image files (PNG, JPG, JPEG, WEBP, GIF, SVG, BMP)
- **Horizontal Scrolling**: Attachments displayed in a horizontal scrollable list
- **Navigation Buttons**: Left/right arrows to navigate through attachments
- **Download**: Hover over attachment to reveal download button
- **File Format Icons**: Display appropriate icons for different file types
- **Drag & Drop**: Drag files onto the drawer to upload

## Styling

The component uses Tailwind CSS utility classes and follows the design system's color palette and spacing guidelines. It's responsive and adapts to the drawer's max-width of `900px`.

## Notes

- The component includes optimistic updates for better UX - local state updates immediately while API calls happen in the background
- File uploads are validated with a 50 MB size limit
- The drawer uses lazy loading for smooth performance
- All text areas auto-resize based on content
- Inline editing is triggered on blur events to save changes
