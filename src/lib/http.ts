import { API_BASE_URL } from "./env";
import { ApiError } from "./errors";

// Add a "json" convenience field; if provided, we'll JSON.stringify it and set headers.
type HttpInit = Omit<RequestInit, "body" | "headers"> & {
  headers?: HeadersInit;
  body?: BodyInit | null;   // raw body (FormData, string, etc.)
  json?: unknown;           // object/array to JSON.stringify
};

export async function http<TResponse>(
  path: string,
  init: HttpInit = {}
): Promise<TResponse> {
  const url = `${API_BASE_URL}${path}`;

  // Normalize headers to a real Headers object so we can .set()
  const headers = new Headers(init.headers);

  // Build the final body
  let body: BodyInit | null | undefined = init.body ?? null;
  if (init.json !== undefined) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    body = JSON.stringify(init.json);
  }

  const res = await fetch(url, { ...init, headers, body });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}
