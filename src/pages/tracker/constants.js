export const TRACKER_TASK_TABLE_COLUMNS = [
  {
    task_name: 'Reception & Lobby',
    description: 'Clean the reception area and lobby',
    checklist_items: ['Lights Working', 'Floor Mopped', 'Sink Cleaned', 'Windows Cleaned'],
  },
  {
    task_name: 'Conference Room',
    description: 'Ensure the conference room is clean and ready',
    checklist_items: ['Table Cleaned', 'Chairs Arranged', 'Projector Working'],
  },
  {
    task_name: 'Pantry Area',
    description: 'Clean and organize pantry area',
    checklist_items: ['Counter Cleaned', 'Dustbin Emptied', 'Floor Mopped'],
  },
  {
    task_name: 'Restroom Maintenance',
    description: 'Clean and sanitize restrooms',
    checklist_items: ['Toilet Cleaned', 'Mirror Wiped', 'Soap Refilled'],
  },
  {
    task_name: 'Workstation Area',
    description: 'Maintain cleanliness of workstation area',
    checklist_items: ['Desks Wiped', 'Chairs Aligned', 'Trash Cleared'],
  },
  {
    task_name: 'Elevator Area',
    description: 'Ensure elevator area is clean',
    checklist_items: ['Buttons Cleaned', 'Floor Mopped', 'Mirror Cleaned'],
  },
  {
    task_name: 'Corridor Cleaning',
    description: 'Clean corridors and walkways',
    checklist_items: ['Floor Swept', 'Floor Mopped', 'No Obstructions'],
  },
  {
    task_name: 'Glass Door Cleaning',
    description: 'Clean all glass doors and panels',
    checklist_items: ['Glass Wiped', 'No Fingerprints', 'Frames Cleaned'],
  },
  {
    task_name: 'Dustbin Management',
    description: 'Check and empty all dustbins',
    checklist_items: ['Bins Emptied', 'New Bags Added', 'Area Clean'],
  },
  {
    task_name: 'Parking Area',
    description: 'Ensure parking area cleanliness',
    checklist_items: ['Trash Removed', 'Floor Swept', 'Lights Working'],
  },
  {
    task_name: 'Security Desk',
    description: 'Maintain cleanliness of security desk',
    checklist_items: ['Desk Cleaned', 'Register Organized', 'Area Neat'],
  },
  {
    task_name: 'Meeting Pods',
    description: 'Clean meeting pods after usage',
    checklist_items: ['Table Cleaned', 'Chairs Adjusted', 'Trash Removed'],
  },
  {
    task_name: 'Staircase Cleaning',
    description: 'Ensure staircases are clean and safe',
    checklist_items: ['Steps Swept', 'Railings Cleaned', 'No Dust'],
  },
  {
    task_name: 'Water Dispenser Area',
    description: 'Maintain cleanliness around water dispensers',
    checklist_items: ['Spill Cleaned', 'Glasses Arranged', 'Floor Dry'],
  },
  {
    task_name: 'Storage Room',
    description: 'Keep storage room organized',
    checklist_items: ['Items Arranged', 'Dust Removed', 'Floor Clean'],
  },
  {
    task_name: 'Fire Exit Check',
    description: 'Ensure fire exit paths are clear',
    checklist_items: ['Path Clear', 'Exit Sign Working', 'Door Accessible'],
  },
  {
    task_name: 'Printer Area',
    description: 'Clean printer and surrounding area',
    checklist_items: ['Printer Dust Removed', 'Paper Arranged', 'Table Clean'],
  },
  {
    task_name: 'Outdoor Entrance',
    description: 'Maintain cleanliness outside entrance',
    checklist_items: ['Trash Removed', 'Mat Cleaned', 'Area Swept'],
  },
  {
    task_name: 'Air Conditioner Check',
    description: 'Basic check of AC vents and cleanliness',
    checklist_items: ['Vents Clean', 'No Dust', 'Cooling Working'],
  },
  {
    task_name: 'Decoration & Plants',
    description: 'Maintain indoor plants and decorations',
    checklist_items: ['Plants Watered', 'Leaves Clean', 'Area Tidy'],
  },
];

export const ASSIGNEE_OPTIONS = {
  HK: [
    'Courtney Henry',
    'Jenny Wilson',
    'Leslie Alexande',
    'Robert Fox',
    'Leslie Alexander',
    'Robert Fox',
  ],

  SUPERVISOR: ['John Doe', 'Jim Doe', 'Jill Doe', 'Jack Doe', 'Jill Doe'],
  CRM: ['John Doe', 'Jane Doe', 'Jim Doe', 'Jill Doe', 'Jack Doe', 'Jill Doe'],
};

export const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = String(i).padStart(2, '0');
  return `${hour}:00`;
});
