import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { api } from "./api/client";
import "./index.css";

// Catches errors React's own error boundary can't (async code, event
// handlers, plain runtime errors) so nothing silently fails without a trace.
window.addEventListener("error", (event) => {
  api.reportFrontendError({
    message: event.message || "Unknown error",
    stack: event.error?.stack || null,
    path: window.location.pathname,
  });
});
window.addEventListener("unhandledrejection", (event) => {
  api.reportFrontendError({
    message: event.reason?.message || String(event.reason) || "Unhandled promise rejection",
    stack: event.reason?.stack || null,
    path: window.location.pathname,
  });
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
