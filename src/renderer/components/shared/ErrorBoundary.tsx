import { Component, type ReactNode } from "react";

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
          <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="text-center space-y-3 scale-in max-w-xs">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--vp-error-soft), #fef2f2)" }}
              >
                <span className="text-xl">⚠️</span>
              </div>
              <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">出错了</h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 break-words">
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
