import { Component } from "react";
import { api } from "../api/client";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    api.reportFrontendError({
      message: error?.message || String(error),
      stack: (error?.stack || "") + "\n" + (info?.componentStack || ""),
      path: window.location.pathname,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e17", color: "#f1f5f9", fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 380 }}>
            <h2 style={{ marginBottom: 8 }}>Nimadir noto'g'ri ketdi</h2>
            <p style={{ color: "#94a3b8", marginBottom: 20 }}>
              Xatolik ro'yxatga olindi. Sahifani yangilashga urinib ko'ring.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}
            >
              Sahifani yangilash
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
