import { ZodError } from 'zod';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export function userMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
