import { enqueueLegalNotification, consumeNotificationBatch, acknowledgeNotification } from './legal_notification_service.js';

async function main() {
  const intake = await enqueueLegalNotification({
    kind: 'matter_intake',
    request_id: 'req-matter-1001',
    matter_id: 'MAT-1001',
    client_name: 'Avery Stone',
    practice_area: 'employment',
    urgency: 'expedited',
    subscribers: [
      { subscriber_id: 'sub-paralegal-1', channel: 'email' },
      { subscriber_id: 'sub-attorney-1', channel: 'portal' }
    ]
  });

  console.log('enqueued', intake);

  const batch = await consumeNotificationBatch(5);
  console.log('consumed', batch);

  for (const message of batch) {
    await acknowledgeNotification(message.message_id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
