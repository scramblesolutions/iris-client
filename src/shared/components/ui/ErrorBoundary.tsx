import React from "react"

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage?: string
  stack?: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message, stack: error.stack }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Render any custom fallback UI with the error message
      return (
        <div className="p-2">
          <h1>Something went wrong.</h1>
          <p>Error: {this.state.errorMessage}</p>
          <pre className="text-xs overflow-auto mt-8">{this.state.stack}</pre>
        </div>
      )
    }

    return this.props.children
  }
}
