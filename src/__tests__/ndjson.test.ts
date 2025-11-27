import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';

import { parseNDJSON, parseNDJSONString, writeNDJSON, serializeNDJSON } from '../utils/ndjson';

describe('NDJSON Utils', () => {
  const testDir = path.join(__dirname, '.test-ndjson');

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('parseNDJSONString', () => {
    it('should parse valid NDJSON string', () => {
      const input = '{"id":1}\n{"id":2}\n{"id":3}';
      const result = parseNDJSONString<{ id: number }>(input);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should handle empty lines', () => {
      const input = '{"id":1}\n\n{"id":2}\n\n';
      const result = parseNDJSONString<{ id: number }>(input);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle whitespace-only lines', () => {
      const input = '{"id":1}\n   \n{"id":2}';
      const result = parseNDJSONString<{ id: number }>(input);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle empty string', () => {
      const result = parseNDJSONString<{ id: number }>('');
      expect(result).toEqual([]);
    });

    it('should parse complex objects', () => {
      const input = '{"name":"test","values":[1,2,3]}\n{"name":"test2","values":[4,5]}';
      const result = parseNDJSONString<{ name: string; values: number[] }>(input);
      expect(result).toEqual([
        { name: 'test', values: [1, 2, 3] },
        { name: 'test2', values: [4, 5] },
      ]);
    });

    it('should throw on invalid JSON', () => {
      const input = '{"id":1}\n{invalid}\n{"id":2}';
      expect(() => parseNDJSONString(input)).toThrow();
    });
  });

  describe('serializeNDJSON', () => {
    it('should serialize array to NDJSON string', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = serializeNDJSON(items);
      expect(result).toBe('{"id":1}\n{"id":2}\n{"id":3}\n');
    });

    it('should handle empty array', () => {
      const result = serializeNDJSON([]);
      expect(result).toBe('\n');
    });

    it('should serialize complex objects', () => {
      const items = [{ name: 'test', values: [1, 2] }];
      const result = serializeNDJSON(items);
      expect(result).toBe('{"name":"test","values":[1,2]}\n');
    });
  });

  describe('parseNDJSON (file)', () => {
    it('should parse NDJSON file', async () => {
      const filePath = path.join(testDir, 'test.ndjson');
      await writeFile(filePath, '{"id":1}\n{"id":2}\n{"id":3}\n');

      const result = await parseNDJSON<{ id: number }>(filePath);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should handle file with trailing newlines', async () => {
      const filePath = path.join(testDir, 'trailing.ndjson');
      await writeFile(filePath, '{"id":1}\n{"id":2}\n\n\n');

      const result = await parseNDJSON<{ id: number }>(filePath);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('writeNDJSON (file)', () => {
    it('should write NDJSON file', async () => {
      const filePath = path.join(testDir, 'output.ndjson');
      const items = [{ id: 1 }, { id: 2 }];

      await writeNDJSON(filePath, items);

      const result = await parseNDJSON<{ id: number }>(filePath);
      expect(result).toEqual(items);
    });
  });

  describe('roundtrip', () => {
    it('should preserve data through serialize/parse cycle', () => {
      const original = [
        { ts: 1000, t: 'cursor.move', to: [100, 200] },
        { ts: 2000, t: 'cursor.click', to: [150, 250] },
      ];

      const serialized = serializeNDJSON(original);
      const parsed = parseNDJSONString(serialized);

      expect(parsed).toEqual(original);
    });
  });
});
