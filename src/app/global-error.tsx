"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FAF6F1", color: "#3D2B1F", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            height: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <p style={{ fontSize: "14px" }}>Something went wrong.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "10px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#D4AF37",
            }}
          >
            Try again
          </button>
          {process.env.NODE_ENV === "development" && (
            <pre style={{ maxWidth: "480px", overflow: "auto", fontSize: "10px", opacity: 0.6 }}>
              {error.message}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
