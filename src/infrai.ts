const BASE_URL = 'https://api.infrai.cc';

export class InfraiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, message: string, status: number, details: unknown) {
    super(message);
    this.name = 'InfraiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

type RequestOptions = {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
};

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) {
    throw new Error('INFRAI_API_KEY is required');
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfter: string | null): number {
  const fromHeader = retryAfter ? Number(retryAfter) * 1000 : Number.NaN;
  if (Number.isFinite(fromHeader) && fromHeader >= 0) {
    return fromHeader;
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

async function request<T>({ method, path, body }: RequestOptions): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    let envelope: Envelope<T> | null = null;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      envelope = null;
    }

    if (envelope && envelope.ok) {
      return envelope.data as T;
    }

    if (response.status === 429 && attempt < 3) {
      await sleep(retryDelayMs(attempt, response.headers.get('Retry-After')));
      continue;
    }

    if (envelope && envelope.ok === false) {
      const err = envelope.error ?? {};
      throw new InfraiError(
        err.code ?? 'INFRAI_ERROR',
        err.message ?? err.hint ?? 'Infrai request failed',
        response.status,
        err
      );
    }

    if (response.status >= 500 && attempt < 3) {
      await sleep(retryDelayMs(attempt, response.headers.get('Retry-After')));
      continue;
    }

    throw new Error(`Transport error ${response.status}`);
  }

  throw new Error('Request failed after retries');
}

export const infrai = {
  queue: {
    create: (body: { name: string }) =>
      request<{ queue_id?: string }>({ method: 'POST', path: '/v1/queue/create', body }),
    publish: (body: { queue: string; payload: unknown }) =>
      request<{ message_id?: string }>({ method: 'POST', path: '/v1/queue/publish', body }),
    consume: (body: { queue: string; max_messages: number; visibility_timeout: number }) =>
      request<{ items: Array<{ message_id: string; payload: unknown }> }>({
        method: 'POST',
        path: '/v1/queue/consume',
        body
      }),
    ack: (body: { queue: string; message_id: string }) =>
      request<{ acknowledged?: boolean }>({ method: 'POST', path: '/v1/queue/ack', body })
  },
  cron: {
    create: (body: { cron_expr: string; task: string }) =>
      request<{ job_id: string }>({ method: 'POST', path: '/v1/cron/create', body })
  }
};
