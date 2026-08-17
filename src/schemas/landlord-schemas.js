import { z } from 'zod';
import { baseAddressSchema } from './address-schema';
import { validatePAN, validateTAN, validateGSTIN } from './client-schema';

/** Bank schema for create landlord: all main fields required */
const landlordBankSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  account_type: z.string().min(1, 'Account type is required'),
  ifsc_code: z.string().min(1, 'IFSC code is required'),
  micr_code: z.string().optional(),
  swift_code: z.string().optional(),
  is_primary: z.boolean().default(false),
});

/** Normalize phone to string (form may receive string or object from phone input) */
const phoneSchema = z
  .union([
    z.string(),
    z.object({ number: z.string().optional(), formattedValue: z.string().optional() }).strip(),
  ])
  .transform((v) => (typeof v === 'string' ? v : v?.formattedValue || v?.number || ''))
  .pipe(z.string().min(1, 'Mobile number is required'));

const landlordContactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone_country: z.string().optional(),
  phone: phoneSchema,
  department: z.string().optional(),
  other_department: z.string().optional(),
  is_spoc: z.boolean().default(false),
});

export const addLandlordContactSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    mobile_no: z.string().min(1, 'Mobile number is required'),
    department: z.string().optional(),
    other_department: z.string().optional(),
    is_primary_contact: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.department === 'Other') {
        return data.other_department != null && String(data.other_department).trim() !== '';
      }
      return true;
    },
    { message: 'Please specify the department name', path: ['other_department'] },
  );

export const defaultAddLandlordContactValues = {
  first_name: '',
  last_name: '',
  email: '',
  mobile_no: '',
  department: '',
  other_department: '',
  is_primary_contact: false,
};

export const addLandlordSchema = z.object({
  name: z
    .string()
    .min(1, 'Landlord name is required')
    .min(2, 'Landlord name must be at least 2 characters'),
  // NOTE: SPOC is intentionally disabled for now (kept for future reuse).
  // spoc: z.string().min(1, 'SPOC is required').min(2, 'SPOC must be at least 2 characters'),
  contact_number: z
    .string()
    .min(1, 'Contact number is required')
    .regex(/^\d+$/, 'Only numeric values are allowed')
    .length(10, 'Contact number must be exactly 10 digits'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  // status: z.string().min(1, 'Status is required'),
});

export const editLandlordSchema = z.object({
  landlord: z.string().min(1, 'Landlord is required'),
  status: z.string().min(1, 'Status is required'),
  first_name: z
    .string()
    .min(1, 'First Name is required')
    .min(2, 'First Name must be at least 2 characters'),
  last_name: z
    .string()
    .min(1, 'Last Name is required')
    .min(2, 'Last Name must be at least 2 characters'),
  spoc_contact_number: z
    .string()
    .min(1, 'SPOC Contact Number is required')
    .regex(/^\d+$/, 'Only numeric values are allowed')
    .length(10, 'Contact number must be exactly 10 digits'),
  spoc_email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

export const createTeamMemberSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  fullName: z
    .string()
    .min(1, 'Full Name is required')
    .min(2, 'Full Name must be at least 2 characters'),
  email: z
    .union([z.string().email('Please enter a valid email address'), z.literal('')])
    .optional(),
});

// Schema for Create Landlord (full form with tabs - Basic Details, Statutory, Bank)
export const landlordCreateSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    legal_name: z.string().min(1, 'Legal name is required'),
    engagement_mode: z.string().min(1, 'Engagement mode is required'),
    contacts: z
      .array(landlordContactSchema)
      .min(1, 'At least one contact is required')
      .refine(
        (contacts) => contacts.some((contact) => contact.is_spoc),
        'At least one contact must be set as SPOC',
      ),
    ...baseAddressSchema.shape,
    billing_address_line1: z.string().optional(),
    billing_address_line2: z.string().optional(),
    billing_state: z.string().optional(),
    billing_city: z.string().optional(),
    billing_pincode: z.string().optional(),
    billing_same_as_primary: z.boolean().default(false),
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
    banks: z.array(landlordBankSchema).min(1, 'At least one bank account is required'),
    center: z.string().min(1, 'Center is required'),
    shop_number: z.string().optional(),
    block_floor: z.string().optional(),
  })
  .superRefine((data, context) => {
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
    if (!data.billing_same_as_primary) {
      const billingAddress = {
        address_line1: data.billing_address_line1,
        address_line2: data.billing_address_line2,
        country: data.country || 'IN',
        state: data.billing_state,
        city: data.billing_city,
        pincode: data.billing_pincode,
      };
      const hasBillingValues = Object.values(billingAddress).some(
        (value) => value && typeof value === 'string' && value.trim() !== '',
      );
      if (hasBillingValues) {
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
    }
  });

export const defaultLandlordValues = {
  name: '',
  legal_name: '',
  engagement_mode: '',
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
  address_line1: '',
  address_line2: '',
  country: 'IN',
  city: '',
  state: '',
  pincode: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_city: '',
  billing_state: '',
  billing_pincode: '',
  billing_same_as_primary: true,
  custom_organization_registration_number: '',
  pan: '',
  custom_tan_number: '',
  custom_gst_status: '',
  gstin: '',
  custom__msme_registered_number: '',
  custom_provident_fund_number: '',
  custom_esi_number: '',
  custom_professional_tax_number: '',
  banks: [
    {
      bank_name: '',
      account_number: '',
      account_type: 'Savings',
      ifsc_code: '',
      micr_code: '',
      swift_code: '',
      is_primary: true,
    },
  ],
  center: '',
  shop_number: '',
  block_floor: '',
};

export const landlordStepFields = {
  basic: ['name', 'legal_name', 'engagement_mode', 'shop_number', 'contacts', 'center'],
  address: ['address_line1', 'address_line2', 'state', 'city', 'pincode'],
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
