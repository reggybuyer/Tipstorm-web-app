import React, { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_BASE;

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [date, setDate] = useState("");
  const [access, setAccess] = useState("free");
  const [requests, setRequests] = useState([]);
  const [slips, setSlips] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      window.location.href = "/admin-login";
    }
  }, []);

  function logout() {
    localStorage.clear();
    window.location.href = "/";
  }

  /* USERS */
  async function loadUsers() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/all-users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUsers(data.users || []);
  }

  /* REQUESTS */
  async function loadRequests() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/subscription-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRequests(data.requests || []);
  }

  async function approve(id) {
    const token = localStorage.getItem("token");
    await fetch(`${API}/approve-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId: id }),
    });
    alert("User activated");
    loadRequests();
  }

  /* CREATE SLIP */
  function addGame() {
    setGames([
      ...games,
      { home: "", away: "", odd: 1, overUnder: "", result: "pending" },
    ]);
  }

  function updateGame(index, field, value) {
    const updated = [...games];
    updated[index][field] = value;
    setGames(updated);
  }

  async function createSlip() {
    const totalOdds = games.reduce(
      (acc, g) => acc * (parseFloat(g.odd) || 1),
      1
    );

    if (totalOdds < 2) {
      alert("Minimum total odds is 2");
      return;
    }

    await fetch(`${API}/slips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, games, access, totalOdds }),
    });

    alert("Slip created");
    setGames([]);
    loadSlips();
  }

  /* LOAD SLIPS */
  async function loadSlips(newPage = 1) {
    const res = await fetch(`${API}/slips?page=${newPage}&limit=${limit}`);
    const data = await res.json();
    setSlips(data.slips || []);
    setPages(data.pages || 1);
    setPage(newPage);
  }

  async function markResult(slipId, index, result) {
    const token = localStorage.getItem("token");
    await fetch(`${API}/slip-result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slipId, gameIndex: index, result }),
    });
    alert("Result updated");
    loadSlips(page);
  }

  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Admin Dashboard</h2>
        <button onClick={logout}>Logout</button>
      </div>

      <h3>Total Users: {users.length}</h3>
      <h3>Total Requests: {requests.length}</h3>
      <h3>Total Slips: {slips.length}</h3>

      <div className="card">
        <h3>Create Slip</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          value={access}
          onChange={(e) => setAccess(e.target.value)}
        >
          <option value="free">Free</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="vip">VIP</option>
        </select>

        {games.map((g, i) => (
          <div key={i}>
            <input
              placeholder="Home"
              value={g.home}
              onChange={(e) => updateGame(i, "home", e.target.value)}
            />
            <input
              placeholder="Away"
              value={g.away}
              onChange={(e) => updateGame(i, "away", e.target.value)}
            />
            <input
              type="number"
              placeholder="Odd"
              value={g.odd}
              onChange={(e) => updateGame(i, "odd", e.target.value)}
            />
            <input
              placeholder="Over/Under"
              value={g.overUnder}
              onChange={(e) => updateGame(i, "overUnder", e.target.value)}
            />
          </div>
        ))}

        <button onClick={addGame}>Add Game</button>
        <button onClick={createSlip}>Create Slip</button>
      </div>

      <div className="card">
        <h3>Users</h3>
        <button onClick={loadUsers}>Load Users</button>
        {users.map((u) => (
          <div key={u.email}>
            <strong>{u.email}</strong>
            <p>Plan: {u.plan}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Requests</h3>
        <button onClick={loadRequests}>Load Requests</button>
        {requests.map((r) => (
          <div key={r._id}>
            <strong>{r.email}</strong>
            <p>Plan: {r.plan}</p>
            <button onClick={() => approve(r._id)}>Activate</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Slips</h3>
        <button onClick={() => loadSlips(1)}>Load Slips</button>
        {slips.map((slip) => (
          <div key={slip._id}>
            <p>{slip.date} — {slip.access}</p>
            {slip.games.map((g, i) => (
              <div key={i}>
                <span>{g.home} vs {g.away}</span>
                <button onClick={() => markResult(slip._id, i, "win")}>
                  Won
                </button>
                <button onClick={() => markResult(slip._id, i, "lost")}>
                  Lost
                </button>
              </div>
            ))}
          </div>
        ))}

        <div>
          <button disabled={page <= 1} onClick={() => loadSlips(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button disabled={page >= pages} onClick={() => loadSlips(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 
