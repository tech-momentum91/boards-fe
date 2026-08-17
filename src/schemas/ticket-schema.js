import { z } from 'zod';

export const ticketCreateSchema = z
  .object({
    // Ticket Details
    ticket_title: z
      .string()
      .trim()
      .min(1, 'Ticket title is required')
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters'),

    custom_ticket_type: z.string().min(1, 'Ticket type is required'),

    status: z.string().min(1, 'Status is required'),

    description: z.string().optional(),

    category: z.string().min(1, 'Category is required'),

    sub_category: z.string().min(1, 'Sub category is required'),

    // priority: z.string().min(1, 'Priority is required'),
    priority: z.string().min(1, 'Priority is required'),

    severity: z.string().optional(),

    // Clients & Center Details
    center: z.string().min(1, 'Center is required'),

    floor_zone: z.string().min(1, 'Floor is required'),

    space: z.string().optional(),

    due_date: z.string().min(1, 'Due date is required'),

    // Incident details
    incident_datetime: z.string().optional(),
    incident_area: z.string().optional(),
    incident_department: z.string().optional(),
    incident_type: z.string().optional(),
    incident_severity: z.string().optional(),
    incident_sensitivity: z.string().optional(),
    incident_reported_via: z.string().optional(),
    management_informed: z.string().optional(),
    financial_impact: z.boolean().optional().default(false),
    incident_data_loss: z.string().optional(),
    incident_injuries_damage: z.string().optional(),
    incident_corrective_action: z.string().optional(),
    incident_root_cause_analysis: z.string().optional(),
    incident_preventive_action: z.string().optional(),
    incident_closure_remarks: z.string().optional(),

    // Assignment & SLA Details
    assign_to: z.union([z.string(), z.array(z.string())]).refine(
      (value) => {
        if (!value) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        return false;
      },
      { message: 'Assignee is required' },
    ),

    // Comments & Attachments
    client_comments: z
      .string()
      .max(200, 'Client comments must not exceed 200 characters')
      .optional(),

    internal_comments: z
      .string()
      .max(200, 'Internal comments must not exceed 200 characters')
      .optional(),

    attachments: z.array(z.any()).optional(),

    // Additional fields for different ticket types
    visible_to_client: z.boolean().optional(),
    customer: z.string().optional(),

    requires_rm: z.boolean().optional().default(false),
    rm_impact: z.string().optional(),
    related_ticket: z.string().optional(),

    issue_raised_by: z.string().optional(),
    center_spoc: z.string().optional(),
    client_spoc: z.string().optional(),
  })
  .refine(
    (data) => {
      // Customer is required for client tickets
      if (data.custom_ticket_type === 'Client ticket') {
        return Boolean(data.customer) && data.customer.trim() !== '';
      }
      return true;
    },
    {
      message: 'Client name is required',
      path: ['customer'],
    },
  )
  .refine(
    (data) => {
      if (data.custom_ticket_type !== 'Incident') return true;
      return String(data.description ?? '').length <= 200;
    },
    {
      message: 'Description must not exceed 200 characters',
      path: ['description'],
    },
  )
  .refine(
    (data) => {
      if (!data.requires_rm) return true;
      const raw = String(data.rm_impact ?? '')
        .trim()
        .replaceAll(',', '');
      if (raw === '') return false;
      return Number.isFinite(Number.parseFloat(raw));
    },
    {
      message: 'R&M impact amount is required when Requires R&M is enabled',
      path: ['rm_impact'],
    },
  );

export const clientTicketCreateSchema = z
  .object({
    ticket_title: z
      .string()
      .trim()
      .min(1, 'Ticket title is required')
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters'),
    description: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    sub_category: z.string().min(1, 'Sub category is required'),
    center: z.string().min(1, 'Center is required'),
    floor_zone: z.string().min(1, 'Floor is required'),
    client_comments: z.string().optional(),
    attachments: z.array(z.any()).optional(),
    requires_rm: z.boolean().optional(),
    rm_impact: z.string().optional(),
    related_ticket: z.string().optional(),
    issue_raised_by: z.string().optional(),
    client_spoc: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.requires_rm) return true;
      const raw = String(data.rm_impact ?? '')
        .trim()
        .replaceAll(',', '');
      if (raw === '') return false;
      return Number.isFinite(Number.parseFloat(raw));
    },
    {
      message: 'R&M impact amount is required when Requires R&M is enabled',
      path: ['rm_impact'],
    },
  );

export const ticketTypeOptions = [
  { label: 'Client Ticket', value: 'client_ticket' },
  { label: 'Internal Snag', value: 'internal_snag' },
];

export const categoryOptions = [
  { label: 'Facility', value: 'facility' },
  { label: 'IT Support', value: 'it_support' },
  { label: 'Housekeeping', value: 'housekeeping' },
  { label: 'Security', value: 'security' },
  { label: 'Billing', value: 'billing' },
  { label: 'Admin', value: 'admin' },
  { label: 'Safety and Compliance', value: 'safety_compliance' },
];

export const subCategoryOptions = {
  facility: [
    { label: 'HVAC', value: 'hvac' },
    { label: 'Electrical', value: 'electrical' },
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'Furniture', value: 'furniture' },
    { label: 'Maintenance', value: 'maintenance' },
  ],
  it_support: [
    { label: 'WiFi Router', value: 'wifi_router' },
    { label: 'Laptop', value: 'laptop' },
    { label: 'Charger', value: 'charger' },
    { label: 'Printer', value: 'printer' },
    { label: 'Network', value: 'network' },
    { label: 'Software', value: 'software' },
  ],
  housekeeping: [
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Pantry', value: 'pantry' },
    { label: 'Washroom', value: 'washroom' },
    { label: 'Common Area', value: 'common_area' },
  ],
  security: [
    { label: 'Access Control', value: 'access_control' },
    { label: 'CCTV', value: 'cctv' },
    { label: 'Visitor Management', value: 'visitor_management' },
  ],
  billing: [
    { label: 'Invoice', value: 'invoice' },
    { label: 'Payment', value: 'payment' },
    { label: 'Charges', value: 'charges' },
  ],
  admin: [
    { label: 'Documentation', value: 'documentation' },
    { label: 'Policy', value: 'policy' },
    { label: 'Process', value: 'process' },
  ],
  safety_compliance: [
    { label: 'Fire Safety', value: 'fire_safety' },
    { label: 'Emergency', value: 'emergency' },
    { label: 'Health Safety', value: 'health_safety' },
  ],
};

export const priorityOptions = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Critical', value: 'Critical' },
];

export const defaultTicketValues = {
  ticket_title: '',
  custom_ticket_type: 'Internal ticket',
  status: 'Open',
  description: '',
  category: '',
  sub_category: '',
  sub_sub_category: '',
  priority: '',
  severity: '',
  center: '',
  floor_zone: '',
  space: '',
  due_date: '',
  assign_to: '',
  client_comments: '',
  internal_comments: '',
  attachments: [],
  visible_to_client: false,
  customer: '',
  incident_datetime: '',
  incident_area: '',
  incident_department: '',
  incident_type: '',
  incident_severity: '',
  incident_sensitivity: '',
  incident_reported_via: '',
  management_informed: '',
  financial_impact: false,
  incident_data_loss: '',
  incident_injuries_damage: '',
  incident_corrective_action: '',
  incident_root_cause_analysis: '',
  incident_preventive_action: '',
  incident_closure_remarks: '',
  requires_rm: false,
  rm_impact: '',
  related_ticket: '',
  issue_raised_by: '',
  center_spoc: '',
  client_spoc: '',
};

export const defaultClientTicketValues = {
  ticket_title: '',
  description: '',
  center: '',
  floor_zone: '',
  client_comments: '',
  custom_ticket_type: 'Client ticket',
  visible_to_client: true,
  customer: '',
  attachments: [],
  requires_rm: false,
  rm_impact: '',
  related_ticket: '',
  issue_raised_by: '',
  client_spoc: '',
};
