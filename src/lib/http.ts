import { API_BASE_URL } from "./env";
import { ApiError } from "./errors";

// Add a "json" convenience field; if provided, we'll JSON.stringify it and set headers.
type HttpInit = Omit<RequestInit, "body" | "headers"> & {
  headers?: HeadersInit;
  body?: BodyInit | null;   // raw body (FormData, string, etc.)
  json?: unknown;           // object/array to JSON.stringify
  timeoutMs?: number;       // optional request timeout
  retry?: number;           // optional number of retries on transient errors
};

export async function http<TResponse>(
  path: string,
  init: HttpInit = {}
): Promise<TResponse> {
  const url = `${API_BASE_URL}${path}`;

  const { timeoutMs, retry, ...rest } = init;

  // Normalize headers to a real Headers object so we can .set()
  const headers = new Headers(rest.headers);

  // Build the final body
  let body: BodyInit | null | undefined = rest.body ?? null;
  if (rest.json !== undefined) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    body = JSON.stringify(rest.json);
  }

  const maxAttempts = Math.max(0, retry ?? 0) + 1;
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const tid = timeoutMs
      ? setTimeout(() => controller?.abort(), timeoutMs)
      : undefined;
    try {
      const res = await fetch(url, { ...rest, headers, body, signal: controller?.signal });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!res.ok) {
        // Retry on transient statuses
        if (attempt < maxAttempts && [429, 503, 504].includes(res.status)) {
          const backoff = 200 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
        throw new ApiError(message, res.status, data);
      }

      if (tid) clearTimeout(tid);
      return data as TResponse;
    } catch (err: any) {
      if (tid) clearTimeout(tid);
      lastError = err;
      // For AbortError or network error (TypeError), allow retry
      const isAbort = err?.name === "AbortError";
      const isNetwork = err instanceof TypeError;
      if (attempt < maxAttempts && (isAbort || isNetwork)) {
        const backoff = 200 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }

  throw lastError as any;
}
