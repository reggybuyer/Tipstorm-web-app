import React, { useState } from "react";
import "../styles.css";
import axios from "axios";

export default function AdminSlipBuilder() {
  const [games, setGames] = useState([{ home: "", away: "", odd: "", overUnder: "" }]);
  const [message, setMessage] = useState("");

  // Update a game field
  const handleChange = (index, field, value) => {
    const newGames = [...games];
    newGames[index][field] = value;
    setGames(newGames);
  };

  // Add/remove game rows
  const addGameRow = () =>
    setGames([...games, { home: "", away: "", odd: "", overUnder: "" }]);
  const removeGameRow = (index) =>
    setGames(games.filter((_, i) => i !== index));

  // Submit slip to backend
  const handleSubmit = async () => {
    try {
      // Validate games
      for (let g of games) {
        if (!g.home || !g.away || !g.odd) {
          setMessage("All game fields except Over/Under are required.");
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

      const adminEmail = "admin@test.com"; // replace if needed
      await axios.post("http://localhost:5000/add-slip", { adminEmail, slip });

      setMessage("Slip added successfully!");
      setGames([{ home: "", away: "", odd: "", overUnder: "" }]);
    } catch (err) {
      console.error(err);
      setMessage("Failed to add slip.");
    }
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
            className="over-under-input"
            value={game.overUnder}
            onChange={(e) => handleChange(index, "overUnder", e.target.value)}
          />
          <button type="button" onClick={() => removeGameRow(index)}>
            Remove
          </button>
        </div>
      ))}

      <div style={{ marginTop: "10px" }}>
        <button type="button" onClick={addGameRow}>
          Add Game
        </button>
        <button type="button" onClick={handleSubmit} style={{ marginLeft: "10px" }}>
          Submit Slip
        </button>
      </div>
    </div>
  );
} 
