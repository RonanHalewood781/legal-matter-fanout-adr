import test from 'node:test';
import assert from 'node:assert/strict';
import { decideNotificationRoute } from '../src/notification_policy.js';

test('deadline follow-up within 3 days routes to priority fanout', () => {
  const result = decideNotificationRoute({
    kind: 'deadline_follow_up',
    request_id: 'req-deadline-77',
    matter_id: 'MAT-77',
    deadline_at: '2026-02-01T17:00:00Z',
    days_until_deadline: 2,
    subscribers: [
      { subscriber_id: 'sub-case-manager', channel: 'email' },
      { subscriber_id: 'sub-client-portal', channel: 'portal' }
    ]
  });

  assert.equal(result.route, 'priority-fanout');
  assert.equal(result.audience_count, 2);
  assert.equal(result.subject, 'Deadline follow-up for matter MAT-77');
  assert.equal(result.summary, '2 day(s) until 2026-02-01T17:00:00Z');
});
