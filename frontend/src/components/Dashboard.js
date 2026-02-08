import React, { useEffect, useState } from "react";
import "../styles.css";
import axios from "axios";

export default function Dashboard({ games, user }) {
  const BACKEND_URL = "https://tipstorm-web-app.onrender.com";

  const [allUsers, setAllUsers] = useState([]);
  const [localGames, setLocalGames] = useState([]);
  const [currentUser, setCurrentUser] = useState(user);
  const [newSlip, setNewSlip] = useState({
    date: "",
    premium: false,
    vip: false,
    games: [{ home: "", away: "", odd: "", overUnder: "" }]
  });
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const subscriptions = {
    weekly: { price: 500 },
    monthly: { price: 1500 },
    vip: { price: 3000 }
  };

  const calculateTotalOdds = gamesArray => {
    const total = gamesArray.reduce((t, g) => t * parseFloat(g.odd || 1), 1);
    return total < 2 ? 2.0 : total.toFixed(2);
  };

  // Load games
  useEffect(() => {
    if (Array.isArray(games)) {
      const updated = games.map(s => ({ ...s, total: calculateTotalOdds(s.games) }));
      setLocalGames(updated);
    }
  }, [games]);

  // Show payment popup for unpaid users
  useEffect(() => {
    if (!currentUser.premium) {
      setPaymentMessage(
        "Send payment to 0789906001 (Mpesa), then forward your payment confirmation along with your registered email via WhatsApp or SMS for activation."
      );
      setShowPopup(true);
    }
  }, [currentUser]);

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/all-users/${currentUser.email}`);
      if (res.data.success) setAllUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/games/${currentUser.email}`);
      if (Array.isArray(res.data)) {
        const updated = res.data.map(s => ({ ...s, total: calculateTotalOdds(s.games) }));
        setLocalGames(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser.role === "admin") {
      fetchAllUsers();
      const i = setInterval(fetchAllUsers, 5000);
      return () => clearInterval(i);
    }
    const u = setInterval(refreshUser, 10000);
    return () => clearInterval(u);
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const updateGame = async (slipIndex, gameIndex, field, value) => {
    const updated = [...localGames];
    if (field === "status") updated[slipIndex].games[gameIndex].result = value.toLowerCase();
    if (field === "overUnder") updated[slipIndex].games[gameIndex].overUnder = value;
    setLocalGames(updated);
    if (currentUser.role === "admin") {
      try {
        await axios.post(`${BACKEND_URL}/update-game`, {
          adminEmail: currentUser.email,
          slipIndex,
          gameIndex,
          result: field === "status" ? value : undefined,
          overUnder: field === "overUnder" ? value : undefined
        });
      } catch (err) {
        console.error("Failed to update game:", err);
      }
    }
  };

  const approveUser = async email => {
    await axios.post(`${BACKEND_URL}/approve-user`, {
      adminEmail: currentUser.email,
      userEmail: email
    });
    fetchAllUsers();
  };

  const activateUser = async (email, plan) => {
    try {
      await axios.post(`${BACKEND_URL}/activate`, {
        adminEmail: currentUser.email,
        userEmail: email,
        plan
      });
      alert(`User ${email} activated as ${plan.toUpperCase()}`);
      fetchAllUsers();
    } catch (err) {
      alert("Activation failed");
      console.error(err);
    }
  };

  const handleSubscribe = type => {
    const price = subscriptions[type].price;
    const msg = `Send KES ${price} to 0789906001 (Mpesa), then forward your payment confirmation along with your registered email via WhatsApp or SMS for activation.`;
    setPaymentMessage(msg);
    setShowPopup(true);
  };

  const closePopup = () => setShowPopup(false);

  const isLocked = slip => {
    if (currentUser.role === "admin") return false;
    if (slip.free) return false;
    if (slip.vip && currentUser.plan !== "vip") return true;
    if (slip.premium && !["vip","weekly","monthly"].includes(currentUser.plan)) return true;
    return false;
  };

  const updateSlipType = async (slipIndex, type) => {
    const updated = [...localGames];
    updated[slipIndex].free = type === "free";
    updated[slipIndex].premium = type === "premium";
    updated[slipIndex].vip = type === "vip";
    setLocalGames(updated);
    try {
      await axios.post(`${BACKEND_URL}/update-slip-type`, {
        adminEmail: currentUser.email,
        slipIndex,
        type
      });
    } catch (err) {
      console.error("Failed to update slip badge:", err);
    }
  };

  const addGameRow = () => setNewSlip({ ...newSlip, games: [...newSlip.games, { home: "", away: "", odd: "", overUnder: "" }] });

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
      await axios.post(`${BACKEND_URL}/add-slip`, {
        adminEmail: currentUser.email,
        slip: slipToSave
      });
      alert("Slip added successfully");
      setNewSlip({ date: "", premium: false, vip: false, games: [{ home: "", away: "", odd: "", overUnder: "" }] });
      refreshUser();
    } catch {
      alert("Failed to add slip");
    }
  };

  const newSlipTotal = calculateTotalOdds(newSlip.games);

  return (
    <div className="dashboard-container">
      {/* ... rest of your JSX stays unchanged ... */}
    </div>
  );
} 
