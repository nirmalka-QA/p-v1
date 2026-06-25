import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface RemoteErrorBoundaryProps {
  /** Project type being mounted — used in the default fallback copy. */
  type: string
  children: ReactNode
  /** Optional custom fallback; receives the error and a retry callback. */
  fallback?: (error: Error, retry: () => void) => ReactNode
  /** Optional hook for telemetry. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface RemoteErrorBoundaryState {
  error: Error | null
}

/**
 * Per-remote isolation. A crash inside a federated remote is caught here and
 * rendered as a fallback, so one remote can never take down the host or sibling
 * remotes. The host wraps every ProjectApp in one of these.
 */
export class RemoteErrorBoundary extends Component<
  RemoteErrorBoundaryProps,
  RemoteErrorBoundaryState
> {
  override state: RemoteErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RemoteErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  private retry = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error) {
      return this.props.fallback?.(error, this.retry) ?? null
    }
    return this.props.children
  }
}
