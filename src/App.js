import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import User from "./components/user";
import UserLogin from "./components/UserLogin";
import UserRegister from "./components/UserRegister";
import Admin from "./components/admin";
import AdminLogin from "./components/AdminLogin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserLogin />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<UserRegister />} />
        <Route path="/user" element={<User />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App; 
