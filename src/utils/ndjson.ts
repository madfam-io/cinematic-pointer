/**
 * NDJSON Utilities
 *
 * Parsing and serialization for Newline Delimited JSON files.
 */

import { readFile, writeFile } from 'fs/promises';

/**
 * Parse an NDJSON file into an array of objects.
 */
export async function parseNDJSON<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, 'utf-8');
  return parseNDJSONString<T>(content);
}

/**
 * Parse an NDJSON string into an array of objects.
 */
export function parseNDJSONString<T>(content: string): T[] {
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

/**
 * Write an array of objects to an NDJSON file.
 */
export async function writeNDJSON<T>(filePath: string, items: T[]): Promise<void> {
  const content = serializeNDJSON(items);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Serialize an array of objects to an NDJSON string.
 */
export function serializeNDJSON<T>(items: T[]): string {
  return items.map((item) => JSON.stringify(item)).join('\n') + '\n';
}
