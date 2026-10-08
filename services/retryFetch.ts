/**
 * Retry wrapper for Chutes generation fetches.
 *
 * The Chutes fleet intermittently answers with HTTP 429 and a body such as
 * "Infrastructure at maximum capacity" when a model is saturated. A user
 * generation should ride that out instead of failing outright, so this helper
 * retries 429 (and optionally 503) with exponential backoff + jitter.
 *
 * Every other status — including 400/404/422 — is returned untouched so callers
 * keep their existing error handling.
 */

export type RetryHint = (retryNumber: number, maxRetries: number) => void;

export interface FetchWithRetryOptions {
  /** Retries after the initial attempt. Default 3 → delays ~2s, 4s, 8s. */
  maxRetries?: number;
  /** Base backoff in ms, doubled per retry. Default 2000. */
  baseDelayMs?: number;
  /** Retry HTTP 503 (Service Unavailable) in addition to 429. Default true. */
  retryOn503?: boolean;
  /** Abort the in-flight request and any pending backoff sleep. */
  signal?: AbortSignal;
  /** Invoked before each backoff sleep with the 1-based retry number. */
  onRetry?: RetryHint;
}

const createAbortError = (): Error => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

/** ±25% jitter keeps delays "roughly" at the nominal 2s/4s/8s. */
const withJitter = (delayMs: number): number =>
  Math.round(delayMs * (0.75 + Math.random() * 0.5));

const sleep = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener('abort', onAbort, { once: true });
  });

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 2000,
    retryOn503 = true,
    signal,
    onRetry,
  } = options;

  const effectiveSignal = signal ?? init.signal ?? undefined;

  for (let attempt = 0; ; attempt += 1) {
    if (effectiveSignal?.aborted) throw createAbortError();

    const response = await fetch(url, { ...init, signal: effectiveSignal ?? null });

    // The proxy marks its own error responses with X-Proxy-Error: 1 (e.g. the
    // permanent "key not configured" 503) — retrying those is pure waste.
    // Upstream passthroughs carry no such header and stay retryable.
    const proxyGenerated = response.headers.get('x-proxy-error') === '1';
    const isRetryable =
      !proxyGenerated && (response.status === 429 || (retryOn503 && response.status === 503));

    if (!isRetryable || attempt >= maxRetries) {
      return response;
    }

    onRetry?.(attempt + 1, maxRetries);
    await sleep(withJitter(baseDelayMs * 2 ** attempt), effectiveSignal);
  }
}
