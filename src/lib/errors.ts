function errorMessageFrom(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;

  if (value && typeof value === "object") {
    const errorLike = value as {
      data?: unknown;
      error?: unknown;
      error_message?: unknown;
      message?: unknown;
    };

    const candidates = [
      errorLike.error_message,
      errorLike.error,
      errorLike.data,
      errorLike.message,
    ];

    for (const candidate of candidates) {
      if (candidate === undefined || candidate === value) continue;
      const message = errorMessageFrom(candidate);
      if (message !== "Unknown API error") return message;
    }
  }

  return "Unknown API error";
}

export class ApiError<T = unknown> extends Error {
  status: number;
  data?: T;

  constructor(message: unknown, status: number, data?: T) {
    super(errorMessageFrom(message));
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}
