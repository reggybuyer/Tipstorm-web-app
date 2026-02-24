require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "supersecretkey";

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  premium: { type: Boolean, default: false },
  plan: { type: String, default: "free" },
  expiresAt: { type: Date, default: null },
});

const User = mongoose.model("User", userSchema);

// Subscription request
const requestSchema = new mongoose.Schema({
  email: String,
  plan: String,
  phone: String,
  message: String,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const SubscriptionRequest = mongoose.model("SubscriptionRequest", requestSchema);

// Slip
const slipSchema = new mongoose.Schema({
  date: { type: String, required: true },
  access: { type: String, default: "free" },
  totalOdds: { type: Number, default: 1 },
  games: [
    {
      home: String,
      away: String,
      odd: Number,
      overUnder: String,
      result: { type: String, default: "pending" },
    }
  ]
});

const Slip = mongoose.model("Slip", slipSchema);

// Auto expire premium
app.use(async (req, res, next) => {
  const now = new Date();
  await User.updateMany(
    { premium: true, expiresAt: { $lt: now } },
    { premium: false, plan: "free", expiresAt: null }
  );
  next();
});

// Register (no approval)
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists)
    return res.status(400).json({ success: false, message: "User exists" });

  const hashed = bcrypt.hashSync(password, 10);
  await User.create({ email, password: hashed });

  res.json({ success: true, message: "Registered. Login now." });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false, message: "Invalid login" });

  const match = bcrypt.compareSync(password, user.password);
  if (!match) return res.json({ success: false, message: "Invalid login" });

  const token = jwt.sign({ id: user._id, role: user.role }, SECRET, {
    expiresIn: "7d",
  });

  res.json({
    success: true,
    token,
    user: {
      email: user.email,
      role: user.role,
      plan: user.plan,
      premium: user.premium,
    },
  });
});

// Users (admin)
app.get("/all-users", async (req, res) => {
  const users = await User.find();
  res.json({ success: true, users });
});

// Subscription request
app.post("/request-subscription", async (req, res) => {
  const { email, plan, phone, message } = req.body;
  await SubscriptionRequest.create({ email, plan, phone, message });
  res.json({ success: true, message: "Request sent" });
});

// Requests (admin)
app.get("/subscription-requests", async (req, res) => {
  const requests = await SubscriptionRequest.find();
  res.json({ success: true, requests });
});

// Approve request (manual activation)
app.post("/approve-request", async (req, res) => {
  const { requestId } = req.body;

  const reqDoc = await SubscriptionRequest.findById(requestId);
  if (!reqDoc) return res.status(404).json({ success: false });

  const user = await User.findOne({ email: reqDoc.email });
  if (user) {
    let duration = 30;
    if (reqDoc.plan === "weekly") duration = 7;

    user.plan = reqDoc.plan;
    user.premium = true;
    user.expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    await user.save();
  }

  reqDoc.status = "approved";
  await reqDoc.save();

  res.json({ success: true });
});

// Create slip
app.post("/slips", async (req, res) => {
  const { date, games, access } = req.body;
  const totalOdds = games.reduce((acc, g) => acc * g.odd, 1);

  const slip = await Slip.create({ date, games, access, totalOdds });
  res.json({ success: true, slip });
});

// Get slips (filter by plan)
app.get("/slips", async (req, res) => {
  const { plan, date } = req.query;

  let query = {};
  if (date) query.date = date;

  const slips = await Slip.find(query);

  const visible = slips.filter(slip => {
    if (slip.access === "free") return true;
    return plan && (plan === slip.access || plan === "vip");
  });

  res.json({ success: true, slips: visible });
});

// Update result
app.post("/slip-result", async (req, res) => {
  const { slipId, gameIndex, result } = req.body;

  const slip = await Slip.findById(slipId);
  if (!slip) return res.status(404).json({ success: false });

  slip.games[gameIndex].result = result;
  await slip.save();

  res.json({ success: true });
});

// Serve frontend
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`)); 
