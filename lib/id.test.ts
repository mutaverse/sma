import { describe, expect, it } from 'vitest';

import { createId } from '@/lib/id';

describe('createId', () => {
  it('returns a UUID v4 even without crypto.randomUUID', () => {
    const original = globalThis.crypto?.randomUUID;
    if (globalThis.crypto) {
      // @ts-expect-error test fallback path
      globalThis.crypto.randomUUID = undefined;
    }

    try {
      const id = createId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      if (globalThis.crypto && original) {
        globalThis.crypto.randomUUID = original;
      }
    }
  });

  it('falls back when crypto.randomUUID throws', () => {
    const original = globalThis.crypto?.randomUUID;
    if (globalThis.crypto) {
      globalThis.crypto.randomUUID = () => {
        throw new Error('secure context required');
      };
    }

    try {
      expect(createId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      if (globalThis.crypto && original) {
        globalThis.crypto.randomUUID = original;
      }
    }
  });
});
