import { File } from 'expo-file-system';

export async function pickCsvText(): Promise<string | null> {
  const picked = await File.pickFileAsync({
    mimeTypes: ['text/csv', 'text/plain', 'text/comma-separated-values', '*/*'],
  });

  if (picked.canceled) {
    return null;
  }

  return new TextDecoder().decode(await picked.result.arrayBuffer());
}
