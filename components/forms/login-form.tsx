"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ identifier: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.identifier.trim() || !form.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: form.identifier.trim(),
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        const msg = result.error.toLowerCase();
        if (msg.includes("suspended")) {
          setError("Account suspended. Contact your administrator.");
        } else if (msg.includes("inactive")) {
          setError("Account inactive. Contact your administrator.");
        } else {
          setError("Invalid email/username or password.");
        }
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setForm({ identifier: email, password });
    setError("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "10px",
    color: "#f9fafb",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#d1d5db",
    fontSize: "13px",
    fontWeight: "500",
    marginBottom: "8px",
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Error box */}
      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          padding: "12px 14px",
          backgroundColor: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "10px",
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0, marginTop: "1px" }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ color: "#f87171", fontSize: "13px", lineHeight: "1.4" }}>{error}</span>
        </div>
      )}

      {/* Email / Username */}
      <div>
        <label style={labelStyle}>Email or Username</label>
        <input
          type="text"
          value={form.identifier}
          onChange={(e) => { setForm({ ...form, identifier: e.target.value }); setError(""); }}
          placeholder="admin@example.com or username"
          autoComplete="username"
          autoFocus
          disabled={loading}
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; }}
          onBlur={(e) => { e.target.style.borderColor = "#374151"; }}
        />
      </div>

      {/* Password */}
      <div>
        <label style={labelStyle}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
            style={{ ...inputStyle, paddingRight: "48px" }}
            onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; }}
            onBlur={(e) => { e.target.style.borderColor = "#374151"; }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: "4px",
              color: "#6b7280", display: "flex", alignItems: "center",
            }}
          >
            {showPassword ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", padding: "13px",
          background: loading ? "#1d4ed8" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          border: "none", borderRadius: "10px",
          color: "#ffffff", fontSize: "14px", fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
          transition: "all 0.15s",
        }}
      >
        {loading ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25"/>
              <path d="M21 12a9 9 0 00-9-9"/>
            </svg>
            Signing in...
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
            </svg>
            Sign In
          </>
        )}
      </button>

      {/* Demo credentials — dev only */}
      {process.env.NODE_ENV === "development" && (
        <div style={{
          padding: "14px", marginTop: "4px",
          backgroundColor: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: "10px",
        }}>
          <p style={{ color: "#fbbf24", fontSize: "11px", fontWeight: "600", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Demo Credentials
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { label: "Root Super Admin", email: "superadmin@posystem.com", pwd: "SuperAdmin@123" },
              { label: "Shop Admin",       email: "shopadmin@posystem.com",  pwd: "ShopAdmin@123"  },
              { label: "Staff",            email: "staff@posystem.com",      pwd: "Staff@123"       },
              { label: "Cashier",          email: "cashier@posystem.com",    pwd: "Cashier@123"     },
            ].map(({ label, email, pwd }) => (
              <button key={email} type="button" onClick={() => fillDemo(email, pwd)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  cursor: "pointer", padding: "6px 8px", borderRadius: "6px",
                  color: "#fcd34d", fontSize: "12px",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(245,158,11,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                <span style={{ fontWeight: "500" }}>{label}</span>
                <span style={{ opacity: 0.6, fontSize: "11px" }}>{email}</span>
              </button>
            ))}
          </div>
          <p style={{ color: "rgba(251,191,36,0.4)", fontSize: "10px", margin: "10px 0 0" }}>
            Run <code style={{ fontFamily: "monospace" }}>npm run db:seed</code> first to create these accounts
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
