import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { handleAPIError, useRetry } from '../../app/hooks/use-error-handling'

describe('handleAPIError', () => {
  it('extracts message from axios error with response', () => {
    const error = {
      isAxiosError: true,
      message: 'Network Error',
      response: {
        status: 400,
        data: { error: { message: 'Server error occurred' } },
      },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Server error occurred')
  })

  it('returns auth error for 401', () => {
    const error = {
      isAxiosError: true,
      response: { status: 401, data: {} },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Session expired. Please sign in again.')
  })

  it('returns permission error for 403', () => {
    const error = {
      isAxiosError: true,
      response: { status: 403, data: {} },
    }
    const result = handleAPIError(error)
    expect(result).toBe("You don't have permission for this action.")
  })

  it('returns not found message for 404', () => {
    const error = {
      isAxiosError: true,
      response: { status: 404, data: {} },
    }
    const result = handleAPIError(error)
    expect(result).toBe('The requested resource was not found.')
  })

  it('handles validation error for 422 with detail', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 422,
        data: { error: { detail: 'Invalid email format' } },
      },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Invalid email format')
  })

  it('handles validation error with array detail', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 422,
        data: { detail: [{ msg: 'field required' }] },
      },
    }
    const result = handleAPIError(error)
    expect(result).toBe('field required')
  })

  it('returns rate limit message for 429', () => {
    const error = {
      isAxiosError: true,
      response: { status: 429, data: {} },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Too many requests. Please slow down.')
  })

  it('returns server error for 500', () => {
    const error = {
      isAxiosError: true,
      response: { status: 500, data: {} },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Server error. Please try again later.')
  })

  it('returns service unavailable for 503', () => {
    const error = {
      isAxiosError: true,
      response: { status: 503, data: {} },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Service temporarily unavailable.')
  })

  it('returns generic message for non-axios error', () => {
    const error = new Error('Something went wrong')
    const result = handleAPIError(error)
    expect(result).toBe('Something went wrong')
  })

  it('returns fallback for unknown error type', () => {
    const result = handleAPIError({ some: 'error' })
    expect(result).toBe('An unexpected error occurred')
  })

  it('falls back to error.message when no response data', () => {
    const error = {
      isAxiosError: true,
      message: 'Connection refused',
      response: { status: 0, data: null },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Connection refused')
  })

  it('prioritizes data.error.message over error.message', () => {
    const error = {
      isAxiosError: true,
      message: 'Network Error',
      response: {
        status: 400,
        data: { error: { message: 'Custom error message' } },
      },
    }
    const result = handleAPIError(error)
    expect(result).toBe('Custom error message')
  })
})

describe('useRetry', () => {
  it('should be defined as a function', () => {
    expect(typeof useRetry).toBe('function')
  })
})