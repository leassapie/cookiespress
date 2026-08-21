/**
 * Application error with HTTP status code.
 * Throw from controllers; caught by app.onError for consistent JSON responses.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}