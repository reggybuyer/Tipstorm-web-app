import React, { useState } from "react";
import axios from "axios";
import "../styles.css";

export default function AdminSlipBuilder({ adminEmail, onSlipAdded }) {
  const [games, setGames] = useState([{ home: "", away: "", odd: "", overUnder: "" }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const backendUrl = "https://tipstorm-web-app.onrender.com";

  // Handle input changes
  const handleChange = (index, field, value) => {
    const newGames = [...games];
    newGames[index][field] = value;
    setGames(newGames);
  };

  // Add a new row
  const addRow = () => setGames([...games, { home: "", away: "", odd: "", overUnder: "" }]);

  // Remove a row
  const removeRow = (index) => setGames(games.filter((_, i) => i !== index));

  // Submit slip
  const handleSubmit = async () => {
    setMessage("");
    setLoading(true);

    // Validate all games
    for (let g of games) {
      if (!g.home || !g.away || !g.odd || isNaN(g.odd)) {
        setMessage("All fields are required and odds must be numbers");
        setLoading(false);
        return;
      }
    }

    const slip = {
      date: new Date().toISOString().split("T")[0],
      premium: true,
      games: games.map((g) => ({
        home: g.home,
        away: g.away,
        odd: parseFloat(g.odd),
        overUnder: g.overUnder || "",
      })),
    };

    try {
      const res = await axios.post(`${backendUrl}/add-slip`, { adminEmail, slip });
      if (res.data.success) {
        setMessage("✅ Slip added successfully!");
        setGames([{ home: "", away: "", odd: "", overUnder: "" }]);
        if (onSlipAdded) onSlipAdded();
      } else {
        setMessage(res.data.message || "Failed to add slip");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add slip");
      console.error("Add slip error:", err.response || err);
    }

    setLoading(false);
  };

  return (
    <div className="admin-slip-builder">
      <h3>Add New Slip</h3>
      {message && <div className="message">{message}</div>}

      {games.map((g, i) => (
        <div key={i} className="game-row">
          <input
            value={g.home}
            onChange={(e) => handleChange(i, "home", e.target.value)}
            placeholder="Home Team"
            className="input-field"
          />
          <input
            value={g.away}
            onChange={(e) => handleChange(i, "away", e.target.value)}
            placeholder="Away Team"
            className="input-field"
          />
          <input
            value={g.odd}
            onChange={(e) => handleChange(i, "odd", e.target.value)}
            placeholder="Odd"
            type="number"
            className="input-field"
          />
          <input
            value={g.overUnder}
            onChange={(e) => handleChange(i, "overUnder", e.target.value)}
            placeholder="Over/Under"
            className="input-field"
          />
          {games.length > 1 && (
            <button className="remove-btn" onClick={() => removeRow(i)}>
              Remove
            </button>
          )}
        </div>
      ))}

      <button className="add-btn" onClick={addRow}>
        + Add Game
      </button>
      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "Submitting..." : "Submit Slip"}
      </button>
    </div>
  );
} 
