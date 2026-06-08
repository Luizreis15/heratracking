import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Custom fallback — if omitted, uses the default Hera error card */
  fallback?: ReactNode;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <ErrorFallback error={this.state.error} reset={this.reset} />
        )
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[40vh]">
      <div className="hera-card p-10 text-center space-y-4 max-w-md w-full">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="font-serif text-lg font-semibold text-foreground">
          Algo deu errado
        </h3>
        <p className="text-sm text-muted-foreground font-mono break-all">
          {error.message}
        </p>
        <button type="button" onClick={reset} className="hera-btn-primary mx-auto">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
