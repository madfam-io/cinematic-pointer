import { jest } from '@jest/globals';

jest.setTimeout(30000);

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  jest.clearAllMocks();
});
