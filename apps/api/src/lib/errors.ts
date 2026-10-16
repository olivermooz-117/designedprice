export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class GeminiError extends AppError {
  constructor(message: string, details?: unknown) {
    super(502, "GEMINI_ERROR", message, details);
  }
}
