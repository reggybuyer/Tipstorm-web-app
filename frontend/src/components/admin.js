import React, { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [slips, setSlips] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [games, setGames] = useState([
    { home: "", away: "", odd: "", type: "Over", line: "" },
  ]);
  const [date, setDate] = useState("");
  const [access, setAccess] = useState("free");

  const [editSlip, setEditSlip] = useState(null);
  const token = localStorage.getItem("token");
  const limit = 10;

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") window.location.href = "/admin-login";
    loadSlips(1);
  }, []);

  function logout() {
    localStorage.clear();
    window.location.href = "/";
  }

  async function loadUsers() {
    const res = await fetch(`${API}/all-users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUsers(data.users || []);
  }

  async function loadRequests() {
    const res = await fetch(`${API}/subscription-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRequests(data.requests || []);
  }

  async function approve(id) {
    await fetch(`${API}/approve-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId: id }),
    });
    alert("User activated");
    loadRequests();
  }

  /* CREATE SLIP */
  function addGameRow() {
    setGames([...games, { home: "", away: "", odd: "", type: "Over", line: "" }]);
  }

  function updateGame(index, field, value) {
    const updated = [...games];
    updated[index][field] = value;
    setGames(updated);
  }

  async function createSlip() {
    const body = { date, access, games };

    const res = await fetch(`${API}/slips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      alert("Slip created");
      setGames([{ home: "", away: "", odd: "", type: "Over", line: "" }]);
      setDate("");
      loadSlips(page);
    } else {
      alert("Failed (total odds must be >= 2)");
    }
  }

  /* SLIPS */
  async function loadSlips(newPage = 1) {
    const res = await fetch(`${API}/slips?page=${newPage}&limit=${limit}`);
    const data = await res.json();
    setSlips(data.slips || []);
    setPages(data.pages || 1);
    setPage(newPage);
  }

  function openEdit(slip) {
    setEditSlip({
      ...slip,
      games: slip.games || [], // <-- ensure array
    });
  }

  function closeEdit() {
    setEditSlip(null);
  }

  function updateEditGame(index, field, value) {
    const updated = [...editSlip.games];
    updated[index][field] = value;
    setEditSlip({ ...editSlip, games: updated });
  }

  async function saveEdit() {
    await fetch(`${API}/slips/${editSlip._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(editSlip),
    });
    alert("Slip updated");
    closeEdit();
    loadSlips(page);
  }

  async function deleteSlip(id) {
    if (!window.confirm("Delete slip?")) return;
    await fetch(`${API}/slips/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    alert("Slip deleted");
    loadSlips(page);
  }

  async function markResult(slipId, index, result) {
    await fetch(`${API}/slip-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slipId, gameIndex: index, result }),
    });
    loadSlips(page);
  }

  return (
    <div className="section">
      <div className="header-row">
        <h2>Admin Dashboard</h2>
        <button className="btn btn-logout" onClick={logout}>
          Logout
        </button>
      </div>

      {/* USERS */}
      <div className="card">
        <h3>Users</h3>
        <button className="btn" onClick={loadUsers}>Load Users</button>
        {users.map((u) => (
          <div key={u.email}>
            <strong>{u.email}</strong>
            <p>Plan: {u.plan}</p>
          </div>
        ))}
      </div>

      {/* REQUESTS */}
      <div className="card">
        <h3>Requests</h3>
        <button className="btn" onClick={loadRequests}>Load Requests</button>
        {requests.map((r) => (
          <div key={r._id}>
            <strong>{r.email}</strong>
            <p>Plan: {r.plan}</p>
            <button className="btn btn-view" onClick={() => approve(r._id)}>
              Activate
            </button>
          </div>
        ))}
      </div>

      {/* CREATE SLIP */}
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
              placeholder="Odd"
              type="number"
              value={g.odd}
              onChange={(e) => updateGame(i, "odd", e.target.value)}
            />
            <select
              value={g.type}
              onChange={(e) => updateGame(i, "type", e.target.value)}
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
            <input
              placeholder="Line"
              value={g.line}
              onChange={(e) => updateGame(i, "line", e.target.value)}
            />
          </div>
        ))}

        <button className="btn" onClick={addGameRow}>Add Game</button>
        <button className="btn btn-upgrade" onClick={createSlip}>
          Create Slip
        </button>
      </div>

      {/* SLIPS LIST */}
      <div className="card">
        <h3>Slips</h3>
        {slips.map((slip) => (
          <div key={slip._id} className="slip-card">
            <div className="slip-header">
              <strong>{slip.date}</strong>
              <span className={`plan-badge plan-${slip.access}`}>
                {slip.access}
              </span>
            </div>

            {slip.games?.map((g, i) => (
              <div key={i} className="game-row">
                <span>{g.home} vs {g.away}</span>
                <span>{g.type} {g.line}</span>
                <span>Odd: {g.odd}</span>
                <span>{g.result || "pending"}</span>
                <button onClick={() => markResult(slip._id, i, "win")}>Won</button>
                <button onClick={() => markResult(slip._id, i, "lost")}>Lost</button>
              </div>
            ))}

            <div className="slip-footer">
              <button onClick={() => openEdit(slip)}>Edit</button>
              <button onClick={() => deleteSlip(slip._id)}>Delete</button>
            </div>
          </div>
        ))}

        <div className="pagination">
          <button disabled={page <= 1} onClick={() => loadSlips(page - 1)}>
            Prev
          </button>
          <span>Page {page} of {pages}</span>
          <button onClick={() => loadSlips(page + 1)}>Next</button>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editSlip && (
        <div className="modal">
          <div className="modal-content">
            <button className="close" onClick={closeEdit}>×</button>
            <h3>Edit Slip</h3>

            {editSlip.games.length > 0 ? (
              editSlip.games.map((g, i) => (
                <div key={i} className="game-row">
                  <input
                    value={g.home}
                    onChange={(e) => updateEditGame(i, "home", e.target.value)}
                  />
                  <input
                    value={g.away}
                    onChange={(e) => updateEditGame(i, "away", e.target.value)}
                  />
                  <input
                    type="number"
                    value={g.odd}
                    onChange={(e) => updateEditGame(i, "odd", e.target.value)}
                  />
                  <select
                    value={g.type}
                    onChange={(e) => updateEditGame(i, "type", e.target.value)}
                  >
                    <option value="Over">Over</option>
                    <option value="Under">Under</option>
                  </select>
                  <input
                    value={g.line}
                    onChange={(e) => updateEditGame(i, "line", e.target.value)}
                  />
                </div>
              ))
            ) : (
              <p>No games in this slip.</p>
            )}

            <button className="btn btn-upgrade" onClick={saveEdit}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
