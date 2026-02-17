import React, { useState } from "react";
import axios from "axios";
import "../styles.css";

export default function Login({ setUser }) {
  const BACKEND_URL = "https://tipstorm-web-app.onrender.com"; // Fixed URL
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  // ===== LOGIN =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${BACKEND_URL}/login`, { email, password });

      if (res.data.success) {
        // Make sure user object has all fields needed in dashboard
        const userData = {
          email: res.data.user.email,
          role: res.data.user.role || "user",
          premium: res.data.user.premium || false,
          approved: res.data.user.approved || false,
          plan: res.data.user.plan || null,
          expiresAt: res.data.user.expiresAt || null,
        };
        setUser(userData);
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Server error, try again.");
    }
  };

  // ===== REGISTER =====
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter email and password");
      return;
    }

    try {
      const res = await axios.post(`${BACKEND_URL}/register`, { email, password });

      if (res.data.success) {
        alert("Registration successful! You can now log in.");
        setIsRegister(false);
        setEmail("");
        setPassword("");
      } else {
        setError(res.data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Register error:", err);
      setError(err.response?.data?.message || "Server error, try again.");
    }
  };

  return (
    <div className="login-container">
      <form
        className="login-form"
        onSubmit={isRegister ? handleRegister : handleLogin}
      >
        <h2>{isRegister ? "Register" : "TipStorm Login"}</h2>

        {error && <p className="error">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">{isRegister ? "Register" : "Login"}</button>

        <p style={{ fontSize: "0.8rem", marginTop: "10px" }}>
          {isRegister ? (
            <>
              Already have an account?{" "}
              <span
                style={{ color: "#007bff", cursor: "pointer" }}
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                }}
              >
                Login
              </span>
            </>
          ) : (
            <>
              New user?{" "}
              <span
                style={{ color: "#007bff", cursor: "pointer" }}
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                }}
              >
                Register
              </span>
            </>
          )}
        </p>
      </form>
    </div>
  );
} 
