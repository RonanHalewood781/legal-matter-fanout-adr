import { infrai } from './infrai.js';
import { LegalNotificationSchema, type LegalNotification } from './legal_notification_types.js';
import { decideNotificationRoute, type RoutedNotification } from './notification_policy.js';

const queueName = process.env.INFRAI_QUEUE_NAME || 'legal-notifications';

export type EnqueuedNotification = RoutedNotification & {
  request_id: string;
  matter_id: string;
  queue_message_id?: string;
};

function idempotencyPayload(input: LegalNotification, decision: RoutedNotification) {
  return {
    request_id: input.request_id,
    matter_id: input.matter_id,
    kind: input.kind,
    route: decision.route,
    audience_count: decision.audience_count,
    subject: decision.subject,
    summary: decision.summary,
    subscribers: input.subscribers
  };
}

export async function enqueueLegalNotification(body: unknown): Promise<EnqueuedNotification> {
  const input = LegalNotificationSchema.parse(body);
  const decision = decideNotificationRoute(input);
  const publishResult = await infrai.queue.publish({
    queue: queueName,
    payload: idempotencyPayload(input, decision)
  });

  return {
    request_id: input.request_id,
    matter_id: input.matter_id,
    queue_message_id: publishResult.message_id,
    ...decision
  };
}

export async function consumeNotificationBatch(maxMessages = 10) {
  const batch = await infrai.queue.consume({
    queue: queueName,
    max_messages: maxMessages,
    visibility_timeout: 60
  });

  return batch.items;
}

export async function acknowledgeNotification(messageId: string) {
  await infrai.queue.ack({ queue: queueName, message_id: messageId });
}
