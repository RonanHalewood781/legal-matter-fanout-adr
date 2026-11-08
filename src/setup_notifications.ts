import { infrai } from './infrai.js';

async function main() {
  const task = process.env.INFRAI_CRON_WEBHOOK_URL;
  if (!task) {
    throw new Error('INFRAI_CRON_WEBHOOK_URL is required');
  }
  const queue = await infrai.queue.create({
    name: process.env.INFRAI_QUEUE_NAME || 'legal-notifications'
  });
  const cron = await infrai.cron.create({
    cron_expr: '0 8 * * 1-5',
    task
  });

  console.log(JSON.stringify({
    queue,
    cron_job_id: cron.job_id
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
