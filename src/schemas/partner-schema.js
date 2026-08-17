import { z } from 'zod';
import { PARTNER_INDUSTRY_TYPE_CHOICES } from '@/components/partner/constants';

const isValidUrl = (value) => {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const optionalUrlSchema = (message = 'Invalid URL') =>
  z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() === '' || isValidUrl(val.trim()), {
      message,
    });

const requiredPhoneSchema = z
  .string()
  .min(1, 'Mobile number is required')
  .refine((val) => {
    const digits = (val || '').replaceAll(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }, 'Enter a valid phone number (10–15 digits)');

const contactSchema = z.object({
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_designation: z.string().optional(),
  contact_email: z.string().min(1, 'Email is required').email('Invalid email address'),
  mobile_number: requiredPhoneSchema,
  is_primary: z.union([z.literal(0), z.literal(1)]),
});

const revenueModelRowSchema = z.object({
  revenue_model: z.string().optional(),
});

export const WEBSITE_REGEX = /^(https?:\/\/)?(www\.)?([\da-z-]+\.)+[a-z]{2,}(\/\S*)?$/i;

export const partnerCreateSchema = z.object({
  partner_name: z.string().min(1, 'Partner name is required'),
  website: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() === '' || WEBSITE_REGEX.test(val.trim()), {
      message: 'Please enter a valid website URL (e.g., example.com or www.example.com)',
    }),

  primary_category: z.enum(['B2B', 'B2C', 'Both']),
  secondary_category: z.string().optional(),

  contact: z
    .array(contactSchema)
    .min(1, 'At least one contact is required')
    .refine((items) => items.some((c) => c?.is_primary === 1), {
      message: 'At least one contact must be marked as Primary Contact',
    }),

  partner_base_state: z.string().min(1, 'State is required'),
  partner_base_city: z.string().min(1, 'Partner base city is required'),
  company_size: z.string().min(1, 'Company size is required'),
  industry_type: z
    .string()
    .min(1, 'Industry type is required')
    .refine((val) => PARTNER_INDUSTRY_TYPE_CHOICES.includes(val), {
      message: 'Select a valid industry type',
    }),

  linkedin_url: optionalUrlSchema('Invalid LinkedIn URL').optional(),
  instagram_url: optionalUrlSchema('Invalid Instagram URL').optional(),
  facebook_url: optionalUrlSchema('Invalid Facebook URL').optional(),
  youtube_url: optionalUrlSchema('Invalid YouTube URL').optional(),

  revenue_model: z.array(revenueModelRowSchema).min(0),
  estimated_engagement_frequency: z.enum(
    ['Monthly', 'Quarterly', 'Bi-annually', 'Annually', 'Ad-hoc'],
    { errorMap: () => ({ message: 'Estimated Engagement Frequency is required' }) },
  ),

  partner_owner: z.string().min(1, 'Partner owner is required'),
  onboarding_stage: z.string().min(1, 'Onboarding stage is required'),
  internal_description: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() === '' || val.trim().length <= 1000, {
      message: 'Internal description must be 1000 characters or less',
    }),
});

export const defaultPartnerValues = {
  partner_name: '',
  website: '',

  primary_category: 'B2B',
  secondary_category: '',

  contact: [
    {
      contact_name: '',
      contact_designation: '',
      contact_email: '',
      mobile_number: '',
      is_primary: 1,
    },
  ],

  partner_base_state: '',
  partner_base_city: '',
  company_size: '',
  industry_type: '',

  linkedin_url: '',
  instagram_url: '',
  facebook_url: '',
  youtube_url: '',

  revenue_model: [],
  estimated_engagement_frequency: '',

  partner_owner: '',
  onboarding_stage: '',
  internal_description: '',
};

export const partnerStepFields = {
  basic: ['partner_name', 'website'],
  category: ['primary_category', 'secondary_category'],
  contacts: ['contact'],
  profile: ['partner_base_state', 'partner_base_city', 'company_size', 'industry_type'],
  social: ['linkedin_url', 'instagram_url', 'facebook_url', 'youtube_url'],
  commercial: ['revenue_model', 'estimated_engagement_frequency'],
  stage: ['partner_owner', 'onboarding_stage', 'internal_description'],
};
