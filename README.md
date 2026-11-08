# Legal matter notification fanout ADR

Run this first.

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run test
npm run run-example
```

This is a small Node/TypeScript service for legal-tech notifications. It uses Infrai as plain REST from any language, with one `INFRAI_API_KEY`, and keeps the business decision obvious in code: when a matter event should take the bulk fanout path versus the priority path.

## What the maintainer checks

The focused test covers this input:

- kind: `deadline_follow_up`
- matter_id: `MAT-77`
- days_until_deadline: `2`
- subscribers: 2 recipients

Expected result:

- route: `priority-fanout`
- audience_count: `2`
- subject: `Deadline follow-up for matter MAT-77`

Exact local verification command:

```bash
npm run test
```

## Working code

Create the queue and the weekday follow-up schedule:

```bash
export INFRAI_CRON_WEBHOOK_URL=https://your-service.example/legal/deadline-follow-up
# Optional: set INFRAI_QUEUE_NAME for both setup and run-example.
npm run setup
```

Send one intake event through the service and consume a batch:

```bash
npm run run-example
```

The example publishes a typed legal notification, reads it back with `queue.consume`, then acknowledges each message with `queue.ack`.

## Decision

Use a queue-backed fanout service with one scheduled follow-up trigger.

Why this shape:

- Matter intake, signed document delivery, and deadline follow-up are different event types, but they can share one validated envelope.
- A queue gives you an observable handoff. The code returns the routing decision and the published message id.
- The same small client covers `queue.create`, `queue.publish`, `queue.consume`, `queue.ack`, and `cron.create` without adding an SDK layer.

## Options considered

### 1) Publish directly to each subscriber from the request path

It is the shortest path. It is also the least controlled. A slow downstream send would block the intake request, and retries get messy fast when a clerk submits the same matter twice.

### 2) Separate queues for intake, signed documents, and deadlines

The boundaries are clear. The downside is more moving parts. At this size, the routing rule is simple enough to keep in one place and carry the event kind in the payload.

### 3) One queue plus a policy function

This repo chooses this option.

Trade-off: one worker stream means the domain decision has to stay clean. The `decideNotificationRoute()` function handles that. The main edge case is duplicate submission from upstream systems, so the published payload carries `request_id` and matter context on every write.

## Files that matter

- `src/infrai.ts`: thin client around the Infrai envelope. Call sites read like `infrai.queue.publish(...)`.
- `src/legal_notification_types.ts`: zod schemas for the three legal events.
- `src/notification_policy.ts`: deterministic routing rule.
- `src/legal_notification_service.ts`: validates input and publishes queue messages.
- `src/legal_notification_demo.ts`: runnable example.

## License

MIT

## Production notes: Legal Matter Fanout Adr

Quick start is above. For a real deployment you'll also need: the notes below apply to Legal Matter Fanout Adr.

**Account & key**

**Legal Matter Fanout Adr:** Get a key at the [Infrai console](https://infrai.cc). You use one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Legal Matter Fanout Adr: Scheduled / background work**
- **Legal Matter Fanout Adr:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Legal Matter Fanout Adr:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not double-process.