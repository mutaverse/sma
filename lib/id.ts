function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < size; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

function uuidFromBytes(bytes: Uint8Array): string {
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createId(): string {
  try {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
      return cryptoApi.randomUUID();
    }
  } catch {
    // Some Hermes/Android builds expose randomUUID but throw when it is called.
  }

  return uuidFromBytes(randomBytes(16));
}
