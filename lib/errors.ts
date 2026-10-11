import { ZodError } from 'zod';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export function userMessage(error: unknown, fallback: string): string {
  const message = readableMessage(error);
  if (!message || isTechnicalMessage(message)) {
    return fallback;
  }

  return message;
}

export function isTechnicalMessage(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > 180 || /[{}[\]<>]|\n/.test(text)) {
    return true;
  }

  const lower = text.toLowerCase();
  return [
    'sqlite',
    'constraint',
    'syntax error',
    'database',
    'native',
    'undefined',
    'typeerror',
    'referenceerror',
    'syntaxerror',
    'network request failed',
    'failed to fetch',
    'timeout',
    'jwt',
    'token',
    'uuid',
    'invalid input',
    'expected ',
    'received ',
    'exception',
    'not a function',
    'cannot read',
    'is not defined',
    'status code',
    'unauthorized',
    'internal server',
    'postgres',
  ].some((needle) => lower.includes(needle));
}

function readableMessage(error: unknown): string | null {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? null;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return null;
}
