import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import UserLogin from "./components/UserLogin";
import UserRegister from "./components/UserRegister";
import AdminLogin from "./components/AdminLogin";
import User from "./components/user";     // lowercase
import Admin from "./components/admin";   // lowercase

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<UserRegister />} />
        <Route path="/user" element={<User />} />

        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />

        <Route path="*" element={<h2 style={{ textAlign: "center" }}>Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}

export default App; 
