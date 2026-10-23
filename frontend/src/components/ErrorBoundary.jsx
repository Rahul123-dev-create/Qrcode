import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-slate-800 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs font-mono text-red-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition"
              >
                Go Home
              </button>
              <button
                onClick={this.reset}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
