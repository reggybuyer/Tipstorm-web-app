import React, { useEffect, useState, useRef } from "react";
import "../styles.css";
import axios from "axios";

export default function Dashboard({ user }) {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [allUsers, setAllUsers] = useState([]);
  const [localGames, setLocalGames] = useState([]);
  const [currentUser, setCurrentUser] = useState(user);
  const [newSlip, setNewSlip] = useState({
    date: "",
    premium: false,
    vip: false,
    games: [{ home: "", away: "", odd: "", overUnder: "" }],
  });
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const emailRef = useRef();
  const passwordRef = useRef();

  const calculateTotalOdds = (gamesArray) => {
    const total = gamesArray.reduce((t, g) => t * parseFloat(g.odd || 1), 1);
    return total < 2 ? 2.0 : total.toFixed(2);
  };

  // ===== Fetch user slips =====
  const refreshUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/games/${currentUser.email}`);
      if (Array.isArray(res.data)) {
        const updated = res.data.map((s) => ({ ...s, total: calculateTotalOdds(s.games) }));
        setLocalGames(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ===== Fetch all users (admin only) =====
  const fetchAllUsers = async () => {
    if (currentUser.role !== "admin") return;
    try {
      const res = await axios.get(`${BACKEND_URL}/all-users/${currentUser.email}`);
      if (res.data.success) setAllUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshUser();
    fetchAllUsers();

    const userInterval = setInterval(refreshUser, 10000);
    const adminInterval = currentUser.role === "admin" ? setInterval(fetchAllUsers, 5000) : null;

    return () => {
      clearInterval(userInterval);
      if (adminInterval) clearInterval(adminInterval);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser.premium) {
      setPaymentMessage(
        "Send payment to 0789906001 (Mpesa), then forward your payment confirmation along with your registered email via WhatsApp or SMS for activation."
      );
      setShowPopup(true);
    }
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // ===== Register new user =====
  const handleRegister = async () => {
    const email = emailRef.current.value.trim();
    const password = passwordRef.current.value.trim();
    if (!email || !password) return alert("Enter email and password");
    try {
      const res = await axios.post(`${BACKEND_URL}/register`, { email, password });
      if (res.data.success) {
        alert(res.data.message);
        emailRef.current.value = "";
        passwordRef.current.value = "";
        fetchAllUsers();
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
  };

  // ===== Approve user (admin) =====
  const approveUser = async (userEmail) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/approve-user`, {
        adminEmail: currentUser.email,
        userEmail,
      });
      if (res.data.success) {
        alert("User approved!");
        fetchAllUsers();
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to approve user");
    }
  };

  // ===== Admin: Update Game =====
  const updateGame = async (slipIndex, gameIndex, field, value) => {
    const updated = [...localGames];
    if (field === "status") updated[slipIndex].games[gameIndex].result = value.toLowerCase();
    if (field === "overUnder") updated[slipIndex].games[gameIndex].overUnder = value;
    setLocalGames(updated);

    if (currentUser.role === "admin") {
      try {
        await axios.post(`${BACKEND_URL}/update-game`, {
          adminEmail: currentUser.email,
          slipId: updated[slipIndex]._id,
          gameIndex,
          result: field === "status" ? value : undefined,
          overUnder: field === "overUnder" ? value : undefined,
        });
      } catch (err) {
        console.error("Failed to update game:", err);
      }
    }
  };

  // ===== Admin: Update Slip Type =====
  const updateSlipType = async (slipIndex, type) => {
    const updated = [...localGames];
    updated[slipIndex].free = type === "free";
    updated[slipIndex].premium = type === "premium";
    updated[slipIndex].vip = type === "vip";
    setLocalGames(updated);

    try {
      await axios.post(`${BACKEND_URL}/update-slip-type`, {
        adminEmail: currentUser.email,
        slipId: updated[slipIndex]._id,
        type,
      });
    } catch (err) {
      console.error("Failed to update slip type:", err);
    }
  };

  // ===== Admin: Add new slip =====
  const addGameRow = () =>
    setNewSlip({ ...newSlip, games: [...newSlip.games, { home: "", away: "", odd: "", overUnder: "" }] });

  const updateNewGame = (i, field, value) => {
    const games = [...newSlip.games];
    games[i][field] = value;
    setNewSlip({ ...newSlip, games });
  };

  const saveSlip = async () => {
    if (!newSlip.date) return alert("Select slip date");
    for (const g of newSlip.games) if (!g.home || !g.away || !g.odd) return alert("Fill all game fields");

    const slipToSave = { ...newSlip };
    slipToSave.total = calculateTotalOdds(slipToSave.games);
    slipToSave.free = !slipToSave.premium && !slipToSave.vip;

    try {
      const res = await axios.post(`${BACKEND_URL}/add-slip`, {
        adminEmail: currentUser.email,
        slip: slipToSave,
      });
      if (res.data.success) {
        alert("Slip added successfully!");
        setNewSlip({
          date: "",
          premium: false,
          vip: false,
          games: [{ home: "", away: "", odd: "", overUnder: "" }],
        });
        refreshUser();
      } else {
        alert(res.data.message || "Failed to add slip");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add slip");
    }
  };

  const newSlipTotal = calculateTotalOdds(newSlip.games);

  return (
    <div className="dashboard-container">
      <h2>Welcome, {currentUser.email}</h2>
      <button onClick={handleLogout}>Logout</button>

      {/* ===== Payment Popup ===== */}
      {showPopup && !currentUser.premium && (
        <div className="popup">
          <p>{paymentMessage}</p>
          <button onClick={() => setShowPopup(false)}>Close</button>
        </div>
      )}

      {/* ===== Admin: Add Slip ===== */}
      {currentUser.role === "admin" && (
        <div className="add-slip">
          <h3>Add New Slip</h3>
          <input type="date" value={newSlip.date} onChange={(e) => setNewSlip({ ...newSlip, date: e.target.value })} />
          <label>
            <input
              type="checkbox"
              checked={newSlip.premium}
              onChange={(e) => setNewSlip({ ...newSlip, premium: e.target.checked })}
            />
            Premium
          </label>
          <label>
            <input
              type="checkbox"
              checked={newSlip.vip}
              onChange={(e) => setNewSlip({ ...newSlip, vip: e.target.checked })}
            />
            VIP
          </label>

          {newSlip.games.map((g, i) => (
            <div key={i}>
              <input placeholder="Home Team" value={g.home} onChange={(e) => updateNewGame(i, "home", e.target.value)} />
              <input placeholder="Away Team" value={g.away} onChange={(e) => updateNewGame(i, "away", e.target.value)} />
              <input placeholder="Odd" value={g.odd} onChange={(e) => updateNewGame(i, "odd", e.target.value)} />
              <input
                placeholder="Over/Under"
                value={g.overUnder}
                onChange={(e) => updateNewGame(i, "overUnder", e.target.value)}
              />
            </div>
          ))}
          <button onClick={addGameRow}>Add Game</button>
          <button onClick={saveSlip}>Submit Slip</button>
        </div>
      )}

      {/* ===== Slips Display ===== */}
      <div className="slips">
        <h3>Slips</h3>
        {localGames.length === 0 ? (
          <p>No slips available</p>
        ) : (
          localGames.map((slip, i) => (
            <div key={i} className="slip-card">
              <strong>{slip.date}</strong> | Total Odds: {slip.total}
              <ul>
                {slip.games.map((g, idx) => (
                  <li key={idx}>
                    {g.home} vs {g.away} | Odd: {g.odd} | Result: {g.result || "-"} | Over/Under: {g.overUnder || "-"}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* ===== Admin Users Table ===== */}
      {currentUser.role === "admin" && (
        <div className="users-table-section">
          <h3>All Users</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Approved</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.length === 0 ? (
                <tr>
                  <td colSpan="5">No users found</td>
                </tr>
              ) : (
                allUsers.map((u, index) => (
                  <tr key={u.email}>
                    <td>{index + 1}</td>
                    <td>{u.email}</td>
                    <td>{u.plan || "free"}</td>
                    <td>{u.approved ? "Yes" : "No"}</td>
                    <td>
                      {!u.approved && u.premium ? (
                        <button onClick={() => approveUser(u.email)}>Approve</button>
                      ) : (
                        <span>Approved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="register-user">
            <h4>Register New User</h4>
            <input ref={emailRef} placeholder="Email" />
            <input ref={passwordRef} type="password" placeholder="Password" />
            <button onClick={handleRegister}>Register</button>
          </div>
        </div>
      )}
    </div>
  );
} 
