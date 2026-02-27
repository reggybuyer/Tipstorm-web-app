import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import User from "./components/user";
import Admin from "./components/admin";
import UserLogin from "./components/UserLogin";
import UserRegister from "./components/UserRegister";
import AdminLogin from "./components/AdminLogin";

function Home() {
  return (
    <div className="section">
      <h2>TipStorm</h2>
      <nav>
        <Link to="/login">User Login</Link> |{" "}
        <Link to="/register">Register</Link> |{" "}
        <Link to="/admin-login">Admin Login</Link>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<UserRegister />} />
        <Route path="/user" element={<User />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
      </Routes>
    </Router>
  );
} 
