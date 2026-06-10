import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || String(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crash caught by ErrorBoundary:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000000",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#151520",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: "10px", marginBottom: "20px", color: "rgba(255,255,255,0.7)" }}>
            The app hit an unexpected error. Try reloading to continue.
          </p>
          {this.state.errorMessage && (
            <p
              style={{
                marginBottom: "20px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.55)",
                wordBreak: "break-word",
                fontFamily: "monospace",
              }}
            >
              {this.state.errorMessage}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              border: "none",
              borderRadius: "999px",
              background: "#ffffff",
              color: "#0b0b10",
              fontWeight: 700,
              fontSize: "14px",
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
