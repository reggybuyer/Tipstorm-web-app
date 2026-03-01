import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import User from "./user";
import UserLogin from "./UserLogin";
import UserRegister from "./UserRegister";
import Admin from "./admin";
import AdminLogin from "./AdminLogin";

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
