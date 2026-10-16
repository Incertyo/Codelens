export class AIControlError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 503,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'AIControlError';
  }
}
