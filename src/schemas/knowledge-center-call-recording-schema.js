import { z } from 'zod';

export const knowledgeCenterCallRecordingSchema = z.object({
  callRecordingName: z.string().trim().min(1, 'Name is required.'),
  center: z.string().optional().default(''),
  client: z.string().optional().default(''),
  company: z.string().optional().default(''),
  callType: z.string().optional().default(''),
  callDatetime: z.string().optional().default(''),
});

export const defaultKnowledgeCenterCallRecordingValues = {
  callRecordingName: '',
  center: '',
  client: '',
  company: '',
  callType: '',
  callDatetime: '',
};
