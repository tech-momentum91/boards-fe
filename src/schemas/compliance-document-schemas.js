import { z } from 'zod';
import { parseDDMMYYYYToTimestamp } from '@/utils/date-utils';

// Document types for compliance documents
// export const DOCUMENT_TYPES = [
//   'Fire Safety Certificate',
//   'Health Inspection Report',
//   'Building Permit',
//   'Environmental Compliance Certificate',
//   'Occupancy Certificate',
//   'NOC (No Objection Certificate)',
//   'Insurance Certificate',
//   'Tax Registration Certificate',
// ];

export const DOCUMENT_TYPES = [
  'BU Fire NOC',
  'Fire Safety Certificate',
  'Building Occupancy Certificate',
  'Trade License',
  'Lift Inspection Certificate',
  'Electrical Safety Certificate',
  'Pollution Control Certificate',
  'Water Test Report',
  'Structural Stability Certificate',
  'Insurance Policy',
  'Other',
];

// Validation schema for adding compliance document
// Note: expiryDate validation is handled conditionally in the component based on has_expiry
export const addComplianceDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document Type is required'),
  otherDocumentType: z.string().trim().optional(),
  expiryDate: z
    .string()
    .optional()
    .refine(
      (value) => {
        // If value is provided, validate format
        if (value && value.trim()) {
          const timestamp = parseDDMMYYYYToTimestamp(value);
          return timestamp !== null;
        }
        return true; // Empty is valid (will be validated conditionally in component)
      },
      { message: 'Date must be in DD/MM/YYYY format' },
    ),
  file: z
    .instanceof(File, { message: 'File is required' })
    .or(z.any().refine((value) => value !== null && value !== undefined, 'File is required')),
});

// Validation schema for editing compliance document - file is optional for edit
// Note: expiryDate validation is handled conditionally in the component based on has_expiry
export const editComplianceDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document Type is required'),
  otherDocumentType: z.string().trim().optional(),
  expiryDate: z
    .string()
    .optional()
    .refine(
      (value) => {
        // If value is provided, validate format
        if (value && value.trim()) {
          const timestamp = parseDDMMYYYYToTimestamp(value);
          return timestamp !== null;
        }
        return true; // Empty is valid (will be validated conditionally in component)
      },
      { message: 'Date must be in DD/MM/YYYY format' },
    ),
  file: z.instanceof(File).optional().or(z.any()),
});
