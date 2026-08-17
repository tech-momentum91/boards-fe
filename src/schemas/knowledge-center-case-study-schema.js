import { z } from 'zod';

export const knowledgeCenterCaseStudyCreateSchema = z.object({
  caseStudyName: z.string().trim().min(1, 'Case study name is required'),
  description: z.string().optional(),
  challenge: z.string().optional(),
  solution: z.string().optional(),
  outcome: z.string().optional(),
  testimonial: z.string().optional(),
  client: z.string().optional(),
  center: z.string().optional(),
  spaceType: z.string().optional(),
  industry: z.string().optional(),
  noOfSeats: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === '' || val === undefined || val === null) return '';
      const n = Number(val);
      return Number.isFinite(n) ? n : '';
    }),
});

export const defaultKnowledgeCenterCaseStudyValues = {
  caseStudyName: '',
  description: '',
  challenge: '',
  solution: '',
  outcome: '',
  testimonial: '',
  client: '',
  center: '',
  spaceType: '',
  industry: '',
  noOfSeats: '',
};
