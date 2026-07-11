import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] 渲染异常:", error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          className="app"
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              color: "var(--danger)",
              marginBottom: 12,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            页面渲染异常
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: 16,
              maxWidth: 420,
              lineHeight: 1.6,
            }}
          >
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 24px",
              borderRadius: "var(--radius)",
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
