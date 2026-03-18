import React, { useEffect, useState, useCallback } from "react";

const API = process.env.REACT_APP_API_BASE || "https://tipstorm-backend.onrender.com";

export default function Admin() {
  const token = localStorage.getItem("token");
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [slips, setSlips] = useState([]);
  const [games, setGames] = useState([]);
  const [date, setDate] = useState("");
  const [access, setAccess] = useState("free");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Badge display
  const badge = (access) => {
    if (access === "free") return "🟢 FREE";
    if (access === "weekly") return "🟡 WEEKLY";
    if (access === "monthly") return "🟠 MONTHLY";
    if (access === "vip") return "🔴 VIP";
    return access;
  };

  // Load users
  const loadUsers = useCallback(async () => {
    const res = await fetch(`${API}/all-users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUsers(data.users || []);
  }, [token]);

  // Delete user
  const deleteUser = useCallback(
    async (id) => {
      if (!window.confirm("Delete this user?")) return;
      await fetch(`${API}/delete-user/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadUsers();
    },
    [token, loadUsers]
  );

  // Load subscription requests
  const loadRequests = useCallback(async () => {
    const res = await fetch(`${API}/subscription-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRequests(data.requests || []);
  }, [token]);

  // Approve subscription
  const approve = useCallback(
    async (id, expiryDate) => {
      if (expiryDate && new Date(expiryDate) > new Date()) {
        alert("User is still active. Cannot re-activate before expiry.");
        return;
      }
      await fetch(`${API}/approve-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: id }),
      });
      alert("User activated");
      loadRequests();
      loadUsers();
    },
    [token, loadRequests, loadUsers]
  );

  // Load slips
  const loadSlips = useCallback(
    async (newPage = 1) => {
      const res = await fetch(`${API}/slips?page=${newPage}&limit=${limit}`);
      const data = await res.json();
      setSlips(data.slips || []);
      setPage(newPage);
    },
    [limit]
  );

  // Delete slip
  const deleteSlip = useCallback(
    async (id) => {
      if (!window.confirm("Delete this slip?")) return;
      await fetch(`${API}/delete-slip/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadSlips(page);
    },
    [token, loadSlips, page]
  );

  // Mark result
  const markResult = useCallback(
    async (slipId, index, result) => {
      await fetch(`${API}/slip-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slipId, gameIndex: index, result }),
      });
      loadSlips(page);
    },
    [token, loadSlips, page]
  );

  // Calculate total odds
  const calculateTotalOdds = (games) => {
    return games.reduce((acc, g) => acc * (parseFloat(g.odd) || 1), 1).toFixed(2);
  };

  // Add game row
  const addGameRow = () => setGames([...games, { home: "", away: "", odd: "", type: "", line: "" }]);
  const updateGame = (index, field, value) => {
    const updated = [...games];
    updated[index][field] = value;
    setGames(updated);
  };

  // Create slip
  const createSlip = async () => {
    if (!games.length) {
      alert("Add at least one game");
      return;
    }

    const body = {
      date,
      access,
      totalOdds: calculateTotalOdds(games),
      games: games.map((g) => ({
        home: g.home || "Team A",
        away: g.away || "Team B",
        odds: parseFloat(g.odd) || 1,
        type: g.type ? g.type.charAt(0).toUpperCase() + g.type.slice(1).toLowerCase() : "Over",
        line: g.line || "",
        result: "pending",
      })),
    };

    const res = await fetch(`${API}/slips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      alert("Slip created");
      setGames([]);
      setDate("");
      loadSlips(page);
    } else {
      alert("Failed to create slip");
    }
  };

  // Admin logout
  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      window.location.href = "/admin-login";
      return;
    }
    loadUsers();
    loadRequests();
    loadSlips(1);
  }, [loadUsers, loadRequests, loadSlips]);

  return (
    <div className="section">
      <div className="header-row">
        <h2>Admin Dashboard</h2>
        <button className="btn btn-logout" onClick={logout}>
          Logout
        </button>
      </div>

      {/* Users */}
      <div className="card">
        <h3>Users</h3>
        {users.map((u) => (
          <div key={u._id} className="game-row">
            <span>{u.email}</span>
            <span className="plan-badge">{u.plan}</span>
            <span>Expiry: {u.expiresAt ? new Date(u.expiresAt).toDateString() : "No expiry"}</span>
            <button className="btn btn-logout" onClick={() => deleteUser(u._id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Subscription Requests */}
      <div className="card">
        <h3>Subscription Requests</h3>
        {requests.map((r) => (
          <div key={r._id} className="game-row">
            <span>{r.email}</span>
            <span>{r.plan}</span>
            <button
              className="btn btn-view"
              onClick={() => approve(r._id, r.expiryDate)}
              disabled={r.expiryDate && new Date(r.expiryDate) > new Date()}
            >
              {r.expiryDate && new Date(r.expiryDate) > new Date() ? "Active" : "Activate"}
            </button>
          </div>
        ))}
      </div>

      {/* Create Slip */}
      <div className="card">
        <h3>Create Slip</h3>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={access} onChange={(e) => setAccess(e.target.value)}>
          <option value="free">Free</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="vip">VIP</option>
        </select>

        {games.map((g, i) => (
          <div key={i} className="game-row">
            <input placeholder="Home" value={g.home} onChange={(e) => updateGame(i, "home", e.target.value)} />
            <input placeholder="Away" value={g.away} onChange={(e) => updateGame(i, "away", e.target.value)} />
            <input
              placeholder="Odd"
              type="number"
              step="0.01"
              value={g.odd}
              onChange={(e) => updateGame(i, "odd", e.target.value)}
            />
            <input
              placeholder="Type (Over/Under)"
              value={g.type}
              onChange={(e) => updateGame(i, "type", e.target.value)}
            />
            <input placeholder="Line" value={g.line} onChange={(e) => updateGame(i, "line", e.target.value)} />
          </div>
        ))}

        <button className="btn" onClick={addGameRow}>
          Add Game
        </button>
        <button className="btn btn-upgrade" onClick={createSlip}>
          Create Slip
        </button>
      </div>

      {/* Slips */}
      <div className="card">
        <h3>Slips</h3>
        {slips.map((slip) => (
          <div key={slip._id} className="slip-card">
            <div className="slip-header">
              <strong>{slip.date}</strong>
              <span className="plan-badge">{badge(slip.access)}</span>
              <span>Total Odds: {parseFloat(slip.totalOdds).toFixed(2)}</span>
              <button className="btn btn-logout" onClick={() => deleteSlip(slip._id)}>
                Delete Slip
              </button>
            </div>

            {slip.games?.map((g, i) => (
              <div key={i} className="game-row">
                <span>
                  {g.home} vs {g.away}
                </span>
                <span>
                  Odd: {(parseFloat(g.odds) || 1).toFixed(2)} | {g.type} {g.line}
                </span>
                <span>{g.result === "won" ? "✅" : g.result === "lost" ? "❌" : "pending"}</span>
                <button onClick={() => markResult(slip._id, i, "won")}>Won</button>
                <button onClick={() => markResult(slip._id, i, "lost")}>Lost</button>
              </div>
            ))}
          </div>
        ))}

        <div className="pagination">
          <button disabled={page <= 1} onClick={() => loadSlips(page - 1)}>
            Prev
          </button>
          <span>Page {page}</span>
          <button disabled={slips.length < limit} onClick={() => loadSlips(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 
