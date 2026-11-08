import type { LegalNotification } from './legal_notification_types.js';

export type RoutedNotification = {
  route: 'bulk-fanout' | 'priority-fanout';
  audience_count: number;
  subject: string;
  summary: string;
};

export function decideNotificationRoute(input: LegalNotification): RoutedNotification {
  const audience_count = input.subscribers.length;

  if (input.kind === 'matter_intake') {
    const route = input.urgency === 'expedited' ? 'priority-fanout' : 'bulk-fanout';
    return {
      route,
      audience_count,
      subject: `New ${input.practice_area} matter intake`,
      summary: `${input.client_name} opened matter ${input.matter_id}`
    };
  }

  if (input.kind === 'signed_document') {
    return {
      route: 'priority-fanout',
      audience_count,
      subject: `Signed document ready: ${input.document_name}`,
      summary: `Matter ${input.matter_id} signed at ${input.signed_at}`
    };
  }

  const route = input.days_until_deadline <= 3 ? 'priority-fanout' : 'bulk-fanout';
  return {
    route,
    audience_count,
    subject: `Deadline follow-up for matter ${input.matter_id}`,
    summary: `${input.days_until_deadline} day(s) until ${input.deadline_at}`
  };
}
