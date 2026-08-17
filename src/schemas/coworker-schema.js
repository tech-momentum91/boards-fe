import { z } from 'zod';

export const coworkerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^[0-9]{10}$/u, 'Phone must be 10 digits'),
  dateOfBirth: z.date().optional(),
  employeeId: z.string().optional(),
  gender: z.string().min(1, 'Gender is required'),

  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  reportingManager: z.string().optional(),
  workMode: z.string().min(1, 'Work mode is required'),
  assignedCenter: z.string().min(1, 'Assigned center is required'),
  status: z.string().min(1, 'Status is required'),

  accessType: z.string().min(1, 'Access type is required'),
  allowBooking: z.boolean().default(false),
  allowVisitorInvites: z.boolean().default(false),
  allowTicketCreation: z.boolean().default(false),
});

export const defaultCoworkerValues = {
  firstName: '',
  lastName: '',
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: undefined,
  employeeId: '',
  gender: '',

  department: '',
  designation: '',
  reportingManager: '',
  workMode: '',
  assignedCenter: '',
  status: 'Active',

  accessType: 'User',
  allowBooking: false,
  allowVisitorInvites: false,
  allowTicketCreation: false,
};
