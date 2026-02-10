import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles.css";

export default function AdminSlipBuilder({ adminEmail }) {
  const [games, setGames] = useState([{ home: "", away: "", odd: "", overUnder: "" }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Replace with your deployed backend URL
  const backendUrl = "https://your-tipstorm-backend.onrender.com";

  // Fetch admin info from backend on mount
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        if (!adminEmail) return;
        const response = await axios.get(`${backendUrl}/all-users/${adminEmail}`);
        const admin = response.data.users.find((u) => u.email === adminEmail && u.role === "admin");
        if (!admin) {
          setMessage("Admin not found or unauthorized.");
        } else {
          setUser(admin);
        }
      } catch (err) {
        console.error(err);
        setMessage("Failed to fetch admin info.");
      }
    };
    fetchAdmin();
  }, [adminEmail]);

  // Update a field in a game row
  const handleChange = (index, field, value) => {
    const newGames = [...games];
    newGames[index][field] = value;
    setGames(newGames);
  };

  // Add new game row
  const addGameRow = () => setGames([...games, { home: "", away: "", odd: "", overUnder: "" }]);

  // Remove a game row
  const removeGameRow = (index) => setGames(games.filter((_, i) => i !== index));

  // Submit slip to backend
  const handleSubmit = async () => {
    setMessage("");
    if (!user) {
      setMessage("Unauthorized. Admin not loaded.");
      return;
    }

    setLoading(true);

    // Validation
    for (let g of games) {
      if (!g.home || !g.away || !g.odd) {
        setMessage("All fields except Over/Under are required.");
        setLoading(false);
        return;
      }
      if (isNaN(g.odd)) {
        setMessage("Odd must be a number.");
        setLoading(false);
        return;
      }
    }

    const slip = {
      date: new Date().toISOString().split("T")[0],
      games: games.map((g) => ({
        home: g.home,
        away: g.away,
        odd: parseFloat(g.odd),
        overUnder: g.overUnder || "",
      })),
      premium: true,
    };

    try {
      const response = await axios.post(`${backendUrl}/add-slip`, { adminEmail, slip });
      console.log("Backend response:", response.data);
      setMessage("Slip added successfully!");
      setGames([{ home: "", away: "", odd: "", overUnder: "" }]);
    } catch (err) {
      console.error(err.response?.data || err.message);
      setMessage(err.response?.data?.message || "Failed to add slip.");
    }

    setLoading(false);
  };

  return (
    <div className="admin-slip-builder">
      <h3>Add New Slip</h3>
      {message && <div className="message">{message}</div>}

      {games.map((game, index) => (
        <div key={index} className="game-row">
          <input
            type="text"
            placeholder="Home Team"
            value={game.home}
            onChange={(e) => handleChange(index, "home", e.target.value)}
          />
          <input
            type="text"
            placeholder="Away Team"
            value={game.away}
            onChange={(e) => handleChange(index, "away", e.target.value)}
          />
          <input
            type="number"
            placeholder="Odd"
            value={game.odd}
            onChange={(e) => handleChange(index, "odd", e.target.value)}
          />
          <input
            type="text"
            placeholder="Over/Under"
            value={game.overUnder}
            onChange={(e) => handleChange(index, "overUnder", e.target.value)}
          />
          {games.length > 1 && (
            <button type="button" onClick={() => removeGameRow(index)}>
              Remove
            </button>
          )}
        </div>
      ))}

      <div style={{ marginTop: "10px" }}>
        <button type="button" onClick={addGameRow}>
          Add Game
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{ marginLeft: "10px" }}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Slip"}
        </button>
      </div>
    </div>
  );
} 
