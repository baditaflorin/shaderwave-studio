import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch() {
    return;
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-950">
          <div className="max-w-lg rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold">
              Shaderwave Studio stopped rendering
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              {this.state.error.message}
            </p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
