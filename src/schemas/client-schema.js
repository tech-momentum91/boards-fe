import { z } from 'zod';
import { baseAddressSchema } from './address-schema';

/**
 * Validates GSTIN check digit using the official algorithm
 * Adapted from: https://gitlab.com/srikanthlogic/gstin-validator/-/blob/master/src/index.js
 * @param {string} gstin - The GSTIN to validate (must be 15 characters)
 * @returns {boolean} - True if check digit is valid
 */
function isGstinCheckDigitValid(gstin) {
  const GSTIN_CODEPOINT_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const module_ = GSTIN_CODEPOINT_CHARS.length;

  if (gstin.length !== 15) {
    return false;
  }

  let factor = 2;
  let sum = 0;

  for (let i = gstin.length - 2; i >= 0; i--) {
    let codePoint = -1;
    for (let j = 0; j < GSTIN_CODEPOINT_CHARS.length; j++) {
      if (GSTIN_CODEPOINT_CHARS[j] === gstin[i]) {
        codePoint = j;
        break;
      }
    }
    if (codePoint === -1) {
      return false;
    }
    let digit = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / module_) + (digit % module_);
    sum += digit;
  }

  const checkCodePoint = (module_ - (sum % module_)) % module_;
  return GSTIN_CODEPOINT_CHARS[checkCodePoint] === gstin[14];
}

// Validation helper functions for use in Zod schemas
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
export const TAN_REGEX = /^[A-Z]{4}\d{5}[A-Z]$/;
export const YEAR_OF_ESTABLISHMENT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const GSTIN_FORMAT_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[\dA-Z]$/;
export const WEBSITE_REGEX = /^(https?:\/\/)?(www\.)?([\da-z-]+\.)+[a-z]{2,}(\/\S*)?$/i;

/**
 * Validates PAN format
 * @param {string} pan - PAN to validate
 * @returns {boolean} - True if valid
 */
export const validatePAN = (pan) => {
  if (!pan || pan.trim().length === 0) return true; // Optional field
  return PAN_REGEX.test(pan.toUpperCase());
};

/**
 * Validates TAN format
 * @param {string} tan - TAN to validate
 * @returns {boolean} - True if valid
 */
export const validateTAN = (tan) => {
  if (!tan || tan.trim().length === 0) return true; // Optional field
  return TAN_REGEX.test(tan.toUpperCase());
};

/**
 * Validates year of establishment format
 * @param {string} year - Year to validate
 * @returns {boolean} - True if valid
 */
export const validateYearOfEstablishment = (year) => {
  if (!year || year.trim().length === 0) return true; // Optional field
  return YEAR_OF_ESTABLISHMENT_REGEX.test(year);
};

/**
 * Validates website format
 * @param {string} website - Website to validate
 * @returns {boolean} - True if valid
 */
export const validateWebsite = (website) => {
  if (!website || website.trim().length === 0) return true; // Optional field
  return WEBSITE_REGEX.test(website);
};

/**
 * Validates GSTIN (format and check digit)
 * @param {string} gstin - GSTIN to validate
 * @returns {object} - { valid: boolean, error: string | null }
 */
export const validateGSTIN = (gstin) => {
  const trimmed = gstin?.trim().toUpperCase() || '';

  if (trimmed.length === 0) {
    return { valid: true, error: null }; // Optional if GST status is not Registered/Composition
  }

  if (trimmed.length !== 15) {
    return { valid: false, error: 'GSTIN must be exactly 15 characters' };
  }

  if (!GSTIN_FORMAT_REGEX.test(trimmed)) {
    return { valid: false, error: 'GSTIN must be in valid format (e.g., 27ABCDE1234F1Z5)' };
  }

  if (!isGstinCheckDigitValid(trimmed)) {
    return {
      valid: false,
      error:
        "Invalid GSTIN! The check digit validation has failed. Please ensure you've typed the GSTIN correctly.",
    };
  }

  return { valid: true, error: null };
};

/**
 * Validates a single client field value
 * @param {string} fieldName - The field name to validate
 * @param {any} value - The value to validate
 * @param {object} context - Additional context (e.g., gstStatus for GSTIN validation)
 * @returns {string|null} - Error message or null if valid
 */
export const validateClientField = (fieldName, value, context = {}) => {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  switch (fieldName) {
    case 'customer_name':
    case 'legal_name':
      if (!trimmedValue || trimmedValue.length === 0) {
        return 'Client legal name is required';
      }
      return null;

    case 'customer_group':
    case 'organization_type':
      if (!trimmedValue || trimmedValue.length === 0) {
        return 'Type of organization is required';
      }
      return null;

    case 'pan':
      if (trimmedValue && trimmedValue.length > 0 && !validatePAN(trimmedValue)) {
        return 'PAN must be in format ABCDE1234F';
      }
      return null;

    case 'custom_tan_number':
    case 'tan_number':
      if (trimmedValue && trimmedValue.length > 0 && !validateTAN(trimmedValue)) {
        return 'TAN must be in format ABCD12345E (4 letters + 5 digits + 1 letter)';
      }
      return null;

    case 'gstin':
    case 'gst_number': {
      const gstStatus = context.gstStatus || context.custom_gst_status;
      if (gstStatus === 'Registered' || gstStatus === 'Composition') {
        if (!trimmedValue || trimmedValue.length === 0) {
          return 'GSTIN is required when GST Status is Registered or Composition';
        }
        const validation = validateGSTIN(trimmedValue);
        if (!validation.valid) {
          return validation.error;
        }
      }
      return null;
    }

    case 'custom_year_of_establishment':
    case 'year_of_establishment':
      if (trimmedValue && trimmedValue.length > 0 && !validateYearOfEstablishment(trimmedValue)) {
        return 'Year of establishment must be in YYYY-MM-DD format';
      }
      return null;

    case 'website':
      if (trimmedValue && trimmedValue.length > 0 && !validateWebsite(trimmedValue)) {
        return 'Please enter a valid website URL (e.g., example.com or www.example.com)';
      }
      return null;

    default:
      // For other fields, no validation (they're optional)
      return null;
  }
};

export const contactSchema = z.object({
  first_name: z.string().min(1, 'First Name is required'),
  last_name: z.string().min(1, 'Last Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone_country: z.string().optional(),
  phone: z.string().min(1, 'Mobile number is required'),
  department: z.string().optional(),
  other_department: z.string().optional(),
  is_spoc: z.boolean().default(false),
});

// Schema for editing a single contact
export const contactEditSchema = z
  .object({
    first_name: z.string().min(1, 'First Name is required'),
    last_name: z.string().min(1, 'Last Name is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    mobile_no: z.string().min(1, 'Mobile number is required'),
    department: z.string().optional(),
    other_department: z.string().optional(),
    is_primary_contact: z.boolean().default(false),
  })
  .superRefine((data, context) => {
    // Validate other_department when department is "Other"
    if (
      data.department === 'Other' &&
      (!data.other_department || data.other_department.trim() === '')
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify the department name',
        path: ['other_department'],
      });
    }
  });

export const defaultContactEditValues = {
  first_name: '',
  last_name: '',
  email: '',
  mobile_no: '',
  department: '',
  other_department: '',
  is_primary_contact: false,
};

export const bankSchema = z.object({
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_type: z.string().optional(),
  ifsc_code: z.string().optional(),
  micr_code: z.string().optional(),
  swift_code: z.string().optional(),
  is_primary: z.boolean().default(false),
});

export const clientCreateSchema = z
  .object({
    display_name: z.string().optional(),
    legal_name: z.string().min(1, 'Client legal name is required'),
    organization_type: z.string().min(1, 'Type of organization is required'),
    company_sector: z.string().optional(),
    year_of_establishment: z
      .string()
      .optional()
      .refine(validateYearOfEstablishment, 'Year of establishment must be in YYYY-MM-DD format'),
    website: z
      .string()
      .optional()
      .refine(
        validateWebsite,
        'Please enter a valid website URL (e.g., example.com or www.example.com)',
      ),
    contacts: z
      .array(contactSchema)
      .min(1, 'At least one contact is required')
      .refine(
        (contacts) => contacts.some((contact) => contact.is_spoc),
        'At least one contact must be set as SPOC',
      ),
    // Primary Address - using baseAddressSchema
    ...baseAddressSchema.shape,
    // Billing Address - optional fields
    billing_address_line1: z.string().optional(),
    billing_address_line2: z.string().optional(),
    billing_country: z.string().optional(),
    billing_state: z.string().optional(),
    billing_city: z.string().optional(),
    billing_pincode: z.string().optional(),
    billing_same_as_primary: z.boolean().default(false),
    // Statutory (backend field names)
    custom_organization_registration_number: z.string().optional(),
    pan: z.string().optional().refine(validatePAN, 'PAN must be in format ABCDE1234F'),
    custom_tan_number: z
      .string()
      .optional()
      .refine(validateTAN, 'TAN must be in format ABCD12345E (4 letters + 5 digits + 1 letter)'),
    custom_gst_status: z
      .union([z.enum(['Registered', 'Unregistered', 'Composition']), z.literal('')])
      .optional(),
    gstin: z.string().optional(),
    custom__msme_registered_number: z.string().optional(),
    custom_provident_fund_number: z.string().optional(),
    custom_esi_number: z.string().optional(),
    custom_professional_tax_number: z.string().optional(),
    // Bank
    banks: z.array(bankSchema).optional(),
    center: z.array(z.string()).min(1, 'At least one center is required'),
  })
  .superRefine((data, context) => {
    // Validate other_department when department is "Other"
    if (data.contacts && Array.isArray(data.contacts)) {
      data.contacts.forEach((contact, index) => {
        if (
          contact.department === 'Other' &&
          (!contact.other_department || contact.other_department.trim() === '')
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please specify the department name',
            path: ['contacts', index, 'other_department'],
          });
        }
      });
    }

    // Validate GSTIN when GST status is Registered or Composition
    if (data.custom_gst_status === 'Registered' || data.custom_gst_status === 'Composition') {
      if (!data.gstin || data.gstin.trim() === '') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GSTIN is required when GST Status is Registered or Composition',
          path: ['gstin'],
        });
      } else {
        const validation = validateGSTIN(data.gstin);
        if (!validation.valid) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: validation.error,
            path: ['gstin'],
          });
        }
      }
    }

    // Validate billing address when it's not same as primary
    if (!data.billing_same_as_primary) {
      const billingAddress = {
        address_line1: data.billing_address_line1,
        address_line2: data.billing_address_line2,
        country: data.billing_country,
        state: data.billing_state,
        city: data.billing_city,
        pincode: data.billing_pincode,
      };

      const result = baseAddressSchema.safeParse(billingAddress);
      if (!result.success) {
        result.error.errors.forEach((error) => {
          context.addIssue({
            code: error.code,
            message: error.message.replace('Address', 'Billing Address'),
            path: [`billing_${error.path[0]}`],
          });
        });
      }
    }
  });

export const defaultClientValues = {
  display_name: '',
  legal_name: '',
  organization_type: '',
  company_sector: '',
  year_of_establishment: '',
  website: '',
  contacts: [
    {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      other_department: '',
      is_spoc: true,
    },
  ],
  // Primary Address
  address_line1: '',
  address_line2: '',
  country: '',
  state: '',
  city: '',
  pincode: '',
  // Billing Address
  billing_address_line1: '',
  billing_address_line2: '',
  billing_country: '',
  billing_state: '',
  billing_city: '',
  billing_pincode: '',
  billing_same_as_primary: true,
  // Statutory (backend field names)
  custom_organization_registration_number: '',
  pan: '',
  custom_tan_number: '',
  custom_gst_status: '',
  gstin: '',
  custom__msme_registered_number: '',
  custom_provident_fund_number: '',
  custom_esi_number: '',
  custom_professional_tax_number: '',
  // Bank
  banks: [
    {
      bank_name: '',
      account_number: '',
      account_type: '',
      ifsc_code: '',
      micr_code: '',
      swift_code: '',
      is_primary: true,
    },
  ],
  center: [],
};

export const clientFormSteps = [
  { id: 1, key: 'info', title: 'Info & Contact Details' },
  { id: 2, key: 'address', title: 'Address' },
  { id: 3, key: 'statutory', title: 'Statutory & Compliance' },
  { id: 4, key: 'bank', title: 'Bank Details' },
];

export const clientStepFields = {
  info: ['display_name', 'legal_name', 'organization_type', 'company_sector', 'contacts', 'center'],
  address: [
    'address_line1',
    'address_line2',
    'country',
    'state',
    'city',
    'pincode',
    'billing_address_line1',
    'billing_address_line2',
    'billing_country',
    'billing_state',
    'billing_city',
    'billing_pincode',
    'billing_same_as_primary',
  ],
  statutory: [
    'custom_organization_registration_number',
    'pan',
    'custom_tan_number',
    'custom_gst_status',
    'gstin',
    'custom__msme_registered_number',
    'custom_provident_fund_number',
    'custom_esi_number',
    'custom_professional_tax_number',
  ],
  bank: [],
};
