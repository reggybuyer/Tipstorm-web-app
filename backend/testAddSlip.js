require("dotenv").config();
const axios = require("axios");

// Replace with your deployed Render backend URL
const backendUrl = "https://tipstorm-web-app.onrender.com";

// Replace with the admin email that exists in your DB
const adminEmail = "admin@test.com";

const testSlip = async () => {
  const slip = {
    date: new Date().toISOString().split("T")[0],
    premium: true,
    games: [
      { home: "Team A", away: "Team B", odd: 1.5, overUnder: "O2.5", result: "" },
      { home: "Team C", away: "Team D", odd: 2.0, overUnder: "U2.5", result: "" },
    ],
  };

  try {
    const res = await axios.post(`${backendUrl}/add-slip`, { adminEmail, slip });
    console.log("Slip added successfully:", res.data);
  } catch (err) {
    console.error("Failed to add slip:", err.response?.data || err.message);
  }
};

testSlip(); 
