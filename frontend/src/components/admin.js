import React, { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [slips, setSlips] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [editSlip, setEditSlip] = useState(null);

  const token = localStorage.getItem("token");
  const limit = 10;

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      window.location.href = "/admin-login";
      return;
    }
    loadSlips(1);
  }, []);

  function logout() {
    localStorage.clear();
    window.location.href = "/";
  }

  /* USERS */
  async function loadUsers() {
    try {
      const res = await fetch(`${API}/all-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  }

  /* REQUESTS */
  async function loadRequests() {
    try {
      const res = await fetch(`${API}/subscription-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {}
  }

  async function approve(id) {
    await fetch(`${API}/approve-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId: id }),
    });
    alert("User activated until expiry");
    loadRequests();
  }

  /* SLIPS */
  async function loadSlips(newPage = 1) {
    try {
      const res = await fetch(`${API}/slips?page=${newPage}&limit=${limit}`);
      const data = await res.json();
      setSlips(data.slips || []);
      setPages(data.pages || 1);
      setPage(newPage);
    } catch {
      setSlips([]);
    }
  }

  function openEdit(slip) {
    setEditSlip({ ...slip });
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
    if (!window.confirm("Delete this slip?")) return;
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
        <button className="btn btn-logout" onClick={logout}>Logout</button>
      </div>

      <h3>Total Users: {users.length}</h3>
      <h3>Total Requests: {requests.length}</h3>
      <h3>Total Slips: {slips.length}</h3>

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

      {/* SLIPS */}
      <div className="card">
        <h3>Slips</h3>
        <button className="btn" onClick={() => loadSlips(1)}>Load Slips</button>

        {slips.length === 0 && <p>No slips available</p>}

        {slips.map((slip) => (
          <div key={slip._id} className="slip-card">
            <p>
              {slip.date} — {slip.access?.toUpperCase()}
            </p>

            {slip.games?.map((g, i) => (
              <div key={i} className="game-row">
                <span>{g.home} vs {g.away}</span>
                <span className={g.type === "Over" ? "badge-win" : "badge-lost"}>
                  {g.type} {g.line}
                </span>
                <span>Odd: {g.odd}</span>
                <span
                  className={
                    g.result === "win"
                      ? "badge-win"
                      : g.result === "lost"
                      ? "badge-lost"
                      : "badge-pending"
                  }
                >
                  {g.result || "pending"}
                </span>
                <button className="badge-win" onClick={() => markResult(slip._id, i, "win")}>
                  Won
                </button>
                <button className="badge-lost" onClick={() => markResult(slip._id, i, "lost")}>
                  Lost
                </button>
              </div>
            ))}

            <div className="slip-footer">
              <button className="btn btn-view" onClick={() => openEdit(slip)}>
                Edit
              </button>
              <button className="btn btn-logout" onClick={() => deleteSlip(slip._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}

        <div className="pagination">
          <button disabled={page <= 1} onClick={() => loadSlips(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => loadSlips(page + 1)}>Next</button>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editSlip && (
        <div className="modal">
          <div className="modal-content">
            <button className="close" onClick={closeEdit}>×</button>
            <h3>Edit Slip</h3>

            <input
              type="date"
              value={editSlip.date}
              onChange={(e) => setEditSlip({ ...editSlip, date: e.target.value })}
            />

            <select
              value={editSlip.access}
              onChange={(e) => setEditSlip({ ...editSlip, access: e.target.value })}
            >
              <option value="free">Free</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="vip">VIP</option>
            </select>

            {editSlip.games?.map((g, i) => (
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
            ))}

            <button className="btn btn-upgrade" onClick={saveEdit}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
