import { z } from 'zod';

export const SubscriberSchema = z.object({
  subscriber_id: z.string().min(1),
  channel: z.enum(['email', 'portal'])
});

export const MatterIntakeSchema = z.object({
  kind: z.literal('matter_intake'),
  request_id: z.string().min(1),
  matter_id: z.string().min(1),
  client_name: z.string().min(1),
  practice_area: z.enum(['employment', 'immigration', 'probate']),
  urgency: z.enum(['routine', 'expedited']),
  subscribers: z.array(SubscriberSchema).min(1)
});

export const SignedDocumentSchema = z.object({
  kind: z.literal('signed_document'),
  request_id: z.string().min(1),
  matter_id: z.string().min(1),
  document_name: z.string().min(1),
  signed_at: z.string().min(1),
  subscribers: z.array(SubscriberSchema).min(1)
});

export const DeadlineFollowUpSchema = z.object({
  kind: z.literal('deadline_follow_up'),
  request_id: z.string().min(1),
  matter_id: z.string().min(1),
  deadline_at: z.string().min(1),
  days_until_deadline: z.number().int(),
  subscribers: z.array(SubscriberSchema).min(1)
});

export const LegalNotificationSchema = z.discriminatedUnion('kind', [
  MatterIntakeSchema,
  SignedDocumentSchema,
  DeadlineFollowUpSchema
]);

export type Subscriber = z.infer<typeof SubscriberSchema>;
export type MatterIntake = z.infer<typeof MatterIntakeSchema>;
export type SignedDocument = z.infer<typeof SignedDocumentSchema>;
export type DeadlineFollowUp = z.infer<typeof DeadlineFollowUpSchema>;
export type LegalNotification = z.infer<typeof LegalNotificationSchema>;
