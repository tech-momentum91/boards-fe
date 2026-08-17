import { z } from 'zod';

import {
  isPresentationMediaType,
  isWalkthroughMediaType,
} from '@/pages/profile/knowledge-center-media-constants';
import { parseMatterportModelId } from '@/utils/knowledge-center-media-preview';

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value.includes('://') ? value : `https://${value}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const knowledgeCenterMediaCreateSchema = z
  .object({
    mediaName: z.string().trim().min(1, 'Media name is required.'),
    description: z.string().optional().default(''),
    center: z.string().optional().default(''),
    floor: z.string().optional().default(''),
    space: z.string().optional().default(''),
    client: z.string().optional().default(''),
    mediaType: z.string().trim().min(1, 'Media type is required.'),
    matterportUrl: z.string().optional().default(''),
    url: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (isWalkthroughMediaType(data.mediaType)) {
      const link = (data.matterportUrl ?? '').trim();
      if (!link) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['matterportUrl'],
          message: 'Walkthrough link is required.',
        });
        return;
      }

      if (!parseMatterportModelId(link)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['matterportUrl'],
          message: 'Enter a valid Matterport showcase link (e.g. my.matterport.com/show/?m=…).',
        });
      }
      return;
    }

    if (!isPresentationMediaType(data.mediaType)) return;

    const link = (data.url ?? '').trim();
    if (!link) return;

    if (!isValidHttpUrl(link)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'Enter a valid URL (e.g. https://…).',
      });
    }
  });

export const defaultKnowledgeCenterMediaValues = {
  mediaName: '',
  description: '',
  center: '',
  floor: '',
  space: '',
  client: '',
  mediaType: '',
  matterportUrl: '',
  url: '',
};
