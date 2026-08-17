// vendor-schemas.js
import { z } from 'zod';

// ── Contact sub-schema ────────────────────────────────────────────────────────

const vendorContactSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be under 50 characters'),

  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be under 50 characters'),

  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),

  phone: z.string().min(1, 'Phone number is required'),

  is_spoc: z.boolean().default(false),
});

// ── Add vendor schema ─────────────────────────────────────────────────────────

export const addVendorSchema = z.object({
  vendor_name: z
    .string()
    .min(1, 'Vendor name is required')
    .max(200, 'Vendor name must be under 200 characters'),

  centers: z.array(z.string()).min(1, 'Please select at least one center'),

  categories: z.array(z.string()).min(1, 'Category is required'),
  sub_categories: z.array(z.string()).min(1, 'Sub-category is required'),
  status: z
    .enum(['Active', 'Inactive'], {
      errorMap: () => ({ message: 'Please select a valid status' }),
    })
    .default('Active'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  contacts: z.array(vendorContactSchema).min(1, 'At least one contact is required'),
  address: z.string().optional().default(''),
});

// Alias used by create-vendor-modal.jsx
export const vendorCreateSchema = addVendorSchema;

// ── Edit vendor schema ────────────────────────────────────────────────────────

export const editVendorSchema = z
  .object({
    vendor_name: z
      .string()
      .min(1, 'Vendor name is required')
      .max(200, 'Vendor name must be under 200 characters'),

    center: z.string().min(1, 'Centre name is required'),

    categories: z.array(z.string()).min(1, 'At least one category is required'),

    sub_categories: z.array(z.string()).optional().default([]),

    status: z
      .enum(['Active', 'Inactive'], {
        errorMap: () => ({ message: 'Please select a valid status' }),
      })
      .default('Active'),

    state: z.string().min(1, 'State is required'),

    city: z.string().min(1, 'City is required'),

    contacts: z.array(vendorContactSchema).min(1, 'At least one contact is required'),
  })
  .superRefine((data, context) => {
    const spocCount = data.contacts.filter((c) => c.is_spoc).length;
    if (spocCount > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only one contact can be set as SPOC',
        path: ['contacts'],
      });
    }
  });

// ── Default form values ───────────────────────────────────────────────────────

export const defaultAddVendorValues = {
  vendor_name: '',
  centers: [],
  categories: [],
  sub_categories: [],
  status: 'Active',
  state: '',
  city: '',
  address: '',
  contacts: [{ first_name: '', last_name: '', email: '', phone: '', is_spoc: true }],
};

// Alias used by create-vendor-modal.jsx
export const defaultVendorValues = defaultAddVendorValues;

export const defaultEditVendorValues = {
  vendor_name: '',
  center: '',
  categories: [],
  sub_categories: [],
  status: 'Active',
  state: '',
  city: '',
  contacts: [],
};

// ── Step fields — used by handleTabChange trigger() ──────────────────────────

export const vendorStepFields = {
  basic: ['vendor_name', 'center', 'categories', 'status'],
  contacts: ['contacts'],
  location: ['state', 'city'],
};

// ── Helper: map API response → edit form defaults ────────────────────────────

export const getEditVendorDefaultValues = (vendor) => {
  if (!vendor) return defaultEditVendorValues;

  return {
    vendor_name: vendor.vendor_name ?? '',
    center: vendor.center ?? vendor.centre_name ?? '',
    categories: Array.isArray(vendor.categories)
      ? vendor.categories
      : vendor.categories
        ? [vendor.categories]
        : [],
    sub_categories: Array.isArray(vendor.sub_categories) ? vendor.sub_categories : [],
    status: vendor.status ?? 'Active',
    state: vendor.state ?? '',
    city: vendor.city ?? vendor.based_city ?? '',
    contacts: Array.isArray(vendor.contacts)
      ? vendor.contacts.map((c) => ({
          first_name: c.first_name ?? '',
          last_name: c.last_name ?? '',
          email: c.email ?? c.contact_email ?? '',
          phone: c.mobile_no ?? c.mobile_number ?? '',
          is_spoc: c.is_primary_contact === 1 || c.is_spoc === 1 || c.is_spoc === true,
        }))
      : [
          {
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            is_spoc: false,
          },
        ],
  };
};

export const defaultAddVendorContactValues = {
  first_name: '',
  last_name: '',
  email: '',
  mobile_no: '',
  is_primary_contact: false,
};

export const addVendorContactSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be under 50 characters'),

  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be under 50 characters'),

  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),

  mobile_no: z.string().min(1, 'Mobile number is required'),

  is_primary_contact: z.boolean().default(false),
});

export const addVendorDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  otherDocumentType: z.string().optional(),
  otherType: z.string().optional(),
  expiryDate: z.string().optional(),
  file: z.any().optional(),
});

export const editVendorDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  otherDocumentType: z.string().optional(),
  otherType: z.string().optional(),
  expiryDate: z.string().optional(),
  file: z.any().optional(),
});
