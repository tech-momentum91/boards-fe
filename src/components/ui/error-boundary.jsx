import React from 'react';
import ErrorStateCard from '@/components/ui/error-state-card';

/**
 * Error boundary to catch runtime errors in the component tree.
 * Renders a fallback UI instead of crashing when a child throws.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const message = this.state.error?.message || 'Something went wrong. Please try again.';
      return (
        <ErrorStateCard
          title='Something went wrong'
          message={message}
          onRetry={
            this.props.onRetry
              ? () => {
                this.setState({ hasError: false, error: null });
                this.props.onRetry();
              }
              : undefined
          }
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
