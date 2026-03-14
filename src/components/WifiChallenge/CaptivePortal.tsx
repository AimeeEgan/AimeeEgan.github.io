import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CaptivePortalProps {
  ssid: string;
  isSecure: boolean;
  onClose: () => void;
}

// you can change this to any password you like
const CORRECT_PASSWORD = "secure123";

export default function CaptivePortal({
  ssid,
  isSecure,
  onClose,
}: CaptivePortalProps) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  
const handleSubmit = () => {
  if (password === CORRECT_PASSWORD) {
    setMessage("✅ Successfully connected to network!");
    if (isSecure) {
      setTimeout(() => {
        navigate("/vpn");
      }, 1500); // short delay so they can see success message
    }
  } else {
    setMessage("❌ Incorrect password. Try again.");
  }
};


  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 400,
          background: "#fff",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 0 12px rgba(0,0,0,0.3)",
        }}
      >
        {/* Fake browser address bar */}
        <div
          style={{
            background: "#f3f3f3",
            padding: "8px 12px",
            borderRadius: "6px",
            marginBottom: "12px",
            fontFamily: "monospace",
            fontSize: "0.9rem",
            color: "#333",
          }}
        >
          {isSecure ? "🔒 " : ""}http{isSecure ? "s" : ""}://
          {ssid.toLowerCase()}-login.com
        </div>

        <h3 style={{ marginTop: 0 }}>Welcome to {ssid.replace("_", " ")} Portal</h3>

        {/* Prompt text (black) */}
        <p style={{ color: "#000", fontWeight: 600, marginBottom: 12 }}>
          Please enter the correct Wi-Fi password.
        </p>

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10,
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSubmit}>Login</button>
          <button onClick={onClose}>Cancel</button>
        </div>

        {message && (
          <div
            style={{
              marginTop: 12,
              color: message.includes("✅") ? "green" : "crimson",
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {!isSecure && (
          <div
            style={{
              marginTop: 16,
              background: "#fff8e1", // light yellow background
              color: "#000",          // black text
              padding: 8,
              borderRadius: 6,
              fontSize: "0.85rem",
              border: "1px solid #ddd",
            }}
          >
            ⚠️ Notice: This portal design looks slightly suspicious. Always
            check the URL and SSL lock before entering credentials!
          </div>
        )}
      </div>
    </div>
  );
}
