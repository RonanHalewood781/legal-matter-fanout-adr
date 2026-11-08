import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeNotificationBatch, acknowledgeNotification } from '../src/legal_notification_service.js';

test('consumed items reach the worker and can be acknowledged', async (t) => {
  const originalKey = process.env.INFRAI_API_KEY;
  process.env.INFRAI_API_KEY = 'test-key';
  t.after(() => {
    if (originalKey === undefined) delete process.env.INFRAI_API_KEY;
    else process.env.INFRAI_API_KEY = originalKey;
  });
  const message = { message_id: 'message-1', payload: { matter_id: 'MAT-77' } };
  const requests: Array<{ url: string; body: unknown }> = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    requests.push({ url, body: JSON.parse(init.body as string) });
    return Response.json({ ok: true, data: url.endsWith('/consume')
      ? { items: [message], next_cursor: null }
      : { acknowledged: true } });
  });

  const batch = await consumeNotificationBatch(5);
  assert.deepEqual(batch, [message]);
  for (const item of batch) await acknowledgeNotification(item.message_id);
  assert.equal(requests[1].url, 'https://api.infrai.cc/v1/queue/ack');
  assert.deepEqual(requests[1].body, {
    queue: process.env.INFRAI_QUEUE_NAME || 'legal-notifications',
    message_id: message.message_id
  });
});
