export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "HttpError"
  }
}

export function jsonError(error: HttpError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? {},
    },
  }
}
