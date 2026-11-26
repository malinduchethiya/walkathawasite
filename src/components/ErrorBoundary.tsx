import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      let displayMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && typeof parsed.error === 'string') {
          displayMessage = `${parsed.error}${parsed.path ? ` (${parsed.operationType} ${parsed.path})` : ''}`;
        }
      } catch {
        // Plain error message
      }

      return (
        <div className="min-h-screen bg-[#141621] text-[#eef0f6] flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-[#1d202e] rounded-xl p-6 border border-[#2c3147]">
            <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
            <p className="mt-2 text-sm text-[#a7acbe] break-words">{displayMessage}</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-5 px-4 py-2 text-sm font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
