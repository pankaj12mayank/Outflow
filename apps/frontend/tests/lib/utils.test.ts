import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, truncate, generateSlug } from '../../app/lib/utils'

describe('formatDate', () => {
  it('formats date string correctly', () => {
    const result = formatDate('2024-03-15')
    expect(result).toMatch(/Mar 15, 2024/)
  })

  it('formats Date object correctly', () => {
    const date = new Date('2024-12-25')
    const result = formatDate(date)
    expect(result).toMatch(/Dec 25, 2024/)
  })

  it('handles ISO format', () => {
    const result = formatDate('2024-01-01T00:00:00.000Z')
    expect(result).toMatch(/Jan 1, 2024/)
  })
})

describe('formatDateTime', () => {
  it('formats date with time', () => {
    const result = formatDateTime('2024-06-15T14:30:00')
    expect(result).toContain('Jun 15, 2024')
  })

  it('shows time in 12-hour format', () => {
    const result = formatDateTime('2024-03-15T13:00:00')
    expect(result).toMatch(/1:00/)
  })
})

describe('truncate', () => {
  it('returns original string if shorter than length', () => {
    const result = truncate('short', 10)
    expect(result).toBe('short')
  })

  it('truncates long strings', () => {
    const result = truncate('This is a very long string', 10)
    expect(result).toBe('This is a ...')
    expect(result.length).toBe(13)
  })

  it('handles exact length strings', () => {
    const result = truncate('exact', 5)
    expect(result).toBe('exact')
  })

  it('handles empty string', () => {
    const result = truncate('', 10)
    expect(result).toBe('')
  })

  it('handles length of 0', () => {
    const result = truncate('test', 0)
    expect(result).toBe('...')
  })
})

describe('generateSlug', () => {
  it('converts to lowercase', () => {
    const result = generateSlug('My Campaign')
    expect(result).toBe('my-campaign')
  })

  it('replaces spaces with hyphens', () => {
    const result = generateSlug('Campaign Name Here')
    expect(result).toBe('campaign-name-here')
  })

  it('removes special characters', () => {
    const result = generateSlug('Test@#$%^&Campaign!')
    expect(result).toBe('test-campaign')
  })

  it('handles multiple spaces', () => {
    const result = generateSlug('Campaign    Name')
    expect(result).toBe('campaign-name')
  })

  it('removes leading and trailing hyphens', () => {
    const result = generateSlug('  Campaign  ')
    expect(result).toBe('campaign')
  })

  it('handles numbers', () => {
    const result = generateSlug('Campaign 2024')
    expect(result).toBe('campaign-2024')
  })

  it('handles mixed content', () => {
    const result = generateSlug('Test Campaign 2024!')
    expect(result).toBe('test-campaign-2024')
  })

  it('handles single word', () => {
    const result = generateSlug('Campaign')
    expect(result).toBe('campaign')
  })
})