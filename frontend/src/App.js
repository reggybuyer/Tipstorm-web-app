import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import AdminSlipBuilder from "./components/AdminSlipBuilder";
import "./styles.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    if (user) {
      const fetchGames = async () => {
        try {
          const res = await fetch(
            `https://tipstorm-web-app.onrender.com/games/${user.email}`
          );
          const data = await res.json();
          setGames(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchGames();
    }
  }, [user]);

  if (!user) return <Login setUser={setUser} />;

  return (
    <div className="container">
      <h1>TipStorm</h1>
      <p>Welcome {user.role === "admin" ? "Admin" : "User"}</p>

      {user.role === "admin" && <AdminSlipBuilder />}

      <Dashboard games={games} user={user} />
    </div>
  );
} 
