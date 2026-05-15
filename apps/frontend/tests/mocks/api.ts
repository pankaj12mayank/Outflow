import { vi } from 'vitest'

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}

export default mockApi