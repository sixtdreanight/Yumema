import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-3 scale-in max-w-xs">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                style={{ background: "var(--vp-error-soft)" }}
              >
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-base font-semibold">出错了</h2>
              <p className="text-xs text-muted-foreground break-words">
                {this.state.error || "未知错误"}
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
