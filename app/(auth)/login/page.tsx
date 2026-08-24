import { LoginForm } from "@/components/forms/login-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign In | EnterprisePOS" };

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0a0f1e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow blobs */}
      <div style={{
        position: "absolute", top: "-160px", left: "-160px",
        width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-160px", right: "-160px",
        width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card container */}
      <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "16px",
            boxShadow: "0 8px 32px rgba(59,130,246,0.4)",
          }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 style={{ color: "#ffffff", fontSize: "24px", fontWeight: "700", margin: "0", letterSpacing: "-0.5px" }}>
            Max Store
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "6px 0 0" }}>
            Multi-Shop Business Management
          </p>
        </div>

        {/* Main card */}
        <div style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}>
          {/* Card header */}
          <div style={{
            padding: "28px 32px 24px",
            borderBottom: "1px solid #1f2937",
          }}>
            <h2 style={{ color: "#f9fafb", fontSize: "18px", fontWeight: "600", margin: "0" }}>
              Sign in to your account
            </h2>
            <p style={{ color: "#6b7280", fontSize: "13px", margin: "6px 0 0" }}>
              Use credentials provided by your administrator
            </p>
          </div>

          {/* Form area */}
          <div style={{ padding: "28px 32px" }}>
            <LoginForm />
          </div>

          {/* Card footer */}
          <div style={{
            padding: "0 32px 24px",
            textAlign: "center",
          }}>
            <p style={{ color: "#4b5563", fontSize: "12px", margin: "0" }}>
              Forgot your password?{" "}
              <span style={{ color: "#60a5fa" }}>Contact your Root Super Admin</span>
            </p>
          </div>
        </div>

        {/* Bottom text */}
        <p style={{
          textAlign: "center", color: "#374151", fontSize: "11px",
          marginTop: "24px",
        }}>
          © {new Date().getFullYear()} EnterprisePOS · All rights reserved
        </p>
      </div>
    </div>
  );
}
