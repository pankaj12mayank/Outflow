import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadingState, EmptyState, ErrorState, RetryState, NoResultsState } from '../../app/components/status-states'

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<LoadingState message="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Create a new item to get started" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Create a new item to get started')).toBeInTheDocument()
  })

  it('renders action button when provided', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<EmptyState title="No items" action={onAction} actionLabel="Add Item" />)
    const button = screen.getByRole('button', { name: /add item/i })
    await user.click(button)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action when actionLabel is missing', () => {
    render(<EmptyState title="No items" action={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders with default severity', () => {
    render(<ErrorState title="Error occurred" />)
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('renders critical severity', () => {
    render(<ErrorState title="Critical Error" severity="critical" />)
    expect(screen.getByText('Critical Error')).toBeInTheDocument()
  })

  it('renders warning severity', () => {
    render(<ErrorState title="Warning" severity="warning" />)
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('renders retry button when onRetry provided', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    const button = screen.getByRole('button', { name: /retry/i })
    await user.click(button)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when onRetry not provided', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })
})

describe('RetryState', () => {
  it('renders with default message', () => {
    render(<RetryState onRetry={vi.fn()} />)
    expect(screen.getByText('Operation failed. Please try again.')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<RetryState onRetry={vi.fn()} message="Custom retry message" />)
    expect(screen.getByText('Custom retry message')).toBeInTheDocument()
  })

  it('calls onRetry when button clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<RetryState onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('NoResultsState', () => {
  it('renders default message without query', () => {
    render(<NoResultsState />)
    expect(screen.getByText('No items to display')).toBeInTheDocument()
  })

  it('renders query in message', () => {
    render(<NoResultsState query="campaign" />)
    expect(screen.getByText('No results for "campaign"')).toBeInTheDocument()
  })

  it('renders clear filters button when onClear provided', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(<NoResultsState onClear={onClear} />)
    const button = screen.getByText('Clear filters')
    await user.click(button)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})