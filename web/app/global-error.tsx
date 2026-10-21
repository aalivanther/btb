"use client";

import { useEffect, type JSX } from "react";

import { ui } from "@/lib/i18n";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps): JSX.Element {
  useEffect(() => {
    console.error("global render error:", error);
  }, [error]);

  return (
    <html lang="es-MX">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#141414",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div role="alert" style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>{ui.home.errorTitle}</p>
          <p style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>{ui.home.errorRetryHint}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              border: "1px solid #b8860b",
              borderRadius: 4,
              background: "transparent",
              color: "#e5b94e",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: 12,
            }}
          >
            {ui.home.errorRetry}
          </button>
        </div>
      </body>
    </html>
  );
}
