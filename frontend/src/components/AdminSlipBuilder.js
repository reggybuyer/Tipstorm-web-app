import React, { useState } from "react";
import axios from "axios";

export default function AdminSlipBuilder({ adminEmail }) {
  const [games, setGames] = useState([{ home: "", away: "", odd: "", overUnder: "" }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const backendUrl = "https://your-tipstorm-backend.onrender.com";

  const handleChange = (i, field, value) => {
    const newGames = [...games]; newGames[i][field] = value; setGames(newGames);
  };
  const addRow = () => setGames([...games, { home: "", away: "", odd: "", overUnder: "" }]);
  const removeRow = (i) => setGames(games.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setMessage(""); setLoading(true);
    for (let g of games) {
      if (!g.home || !g.away || !g.odd || isNaN(g.odd)) {
        setMessage("All fields required and odds must be numbers"); setLoading(false); return;
      }
    }
    const slip = { date: new Date().toISOString().split("T")[0], games: games.map(g => ({ ...g, odd: parseFloat(g.odd) })), premium: true };
    try {
      await axios.post(`${backendUrl}/add-slip`, { adminEmail, slip });
      setMessage("Slip added!"); setGames([{ home: "", away: "", odd: "", overUnder: "" }]);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add slip");
    }
    setLoading(false);
  };

  return (
    <div className="admin-slip-builder">
      <h3>Add New Slip</h3>
      {message && <div className="message">{message}</div>}
      {games.map((g, i) => (
        <div key={i} className="game-row">
          <input value={g.home} onChange={e => handleChange(i, "home", e.target.value)} placeholder="Home Team" />
          <input value={g.away} onChange={e => handleChange(i, "away", e.target.value)} placeholder="Away Team" />
          <input value={g.odd} onChange={e => handleChange(i, "odd", e.target.value)} placeholder="Odd" type="number"/>
          <input value={g.overUnder} onChange={e => handleChange(i, "overUnder", e.target.value)} placeholder="Over/Under" />
          {games.length > 1 && <button onClick={() => removeRow(i)}>Remove</button>}
        </div>
      ))}
      <button onClick={addRow}>Add Game</button>
      <button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit Slip"}</button>
    </div>
  );
} 
