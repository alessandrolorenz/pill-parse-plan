import { vi } from 'vitest';

const AsyncStorage = {
  getItem: vi.fn().mockResolvedValue(null),
  setItem: vi.fn().mockResolvedValue(null),
  removeItem: vi.fn().mockResolvedValue(null),
  clear: vi.fn().mockResolvedValue(null),
};

export default AsyncStorage;
