import { useAuth0 } from "@auth0/auth0-react";

const AUTH0_DOMAIN = "dev-kau033qhn14wvml2.us.auth0.com";
const AUTH0_CLIENT_ID = "WTlaBANBx25ZuyXwyOEFJpv9Xumb3v8l";

export { AUTH0_DOMAIN, AUTH0_CLIENT_ID };

export function LoginScreen() {
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <div
      style={{
        backgroundColor: "#080808",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace",
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "56px",
            height: "56px",
            backgroundColor: "#00ff88",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "24px",
          }}
        >
          💪
        </div>

        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "26px",
            fontWeight: 800,
            color: "#fff",
            margin: "0 0 6px",
            letterSpacing: "-0.5px",
          }}
        >
          AK <span style={{ color: "#00ff88" }}>Pack</span>
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: "#555",
            margin: "0 0 40px",
          }}
        >
          Daily Account Manager
        </p>

        {/* Card */}
        <div
          style={{
            backgroundColor: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: "14px",
            padding: "28px 24px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "#aaa",
              marginBottom: "20px",
              lineHeight: 1.6,
            }}
          >
            Sign in to access your collection reports and advance payments.
          </p>

          <button
            type="button"
            onClick={() => loginWithRedirect()}
            disabled={isLoading}
            style={{
              width: "100%",
              backgroundColor: "#00ff88",
              color: "#000",
              border: "none",
              borderRadius: "10px",
              padding: "13px 20px",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              letterSpacing: "0.3px",
            }}
          >
            {isLoading ? "Loading..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Auth0Guard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: "#080808",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          color: "#555",
          fontSize: "12px",
        }}
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: "#080808",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          color: "#ff4444",
          fontSize: "12px",
          padding: "16px",
          textAlign: "center",
        }}
      >
        Auth error: {error.message}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
