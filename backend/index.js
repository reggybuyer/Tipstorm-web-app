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

/* ======================
   MongoDB Connection
====================== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ======================
   User Schema
====================== */
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  premium: { type: Boolean, default: false },
  plan: { type: String, default: "free" },
  expiresAt: { type: Date, default: null },
});

const User = mongoose.model("User", userSchema);

/* ======================
   Subscription Request
====================== */
const requestSchema = new mongoose.Schema({
  email: String,
  plan: String,
  phone: String,
  message: String,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const SubscriptionRequest = mongoose.model("SubscriptionRequest", requestSchema);

/* ======================
   Slip Schema
====================== */
const slipSchema = new mongoose.Schema({
  date: { type: String, required: true },
  access: { type: String, default: "free" }, // free, weekly, monthly, vip
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

/* ======================
   Auto Expire Premium
====================== */
app.use(async (req, res, next) => {
  const now = new Date();
  await User.updateMany(
    { premium: true, expiresAt: { $lt: now } },
    { premium: false, plan: "free", expiresAt: null }
  );
  next();
});

/* ======================
   Register
====================== */
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ success: false, message: "User exists" });
  }

  const hashed = bcrypt.hashSync(password, 10);
  await User.create({ email, password: hashed });

  res.json({ success: true, message: "Registered. Login now." });
});

/* ======================
   Login
====================== */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: "Invalid login" });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.json({ success: false, message: "Invalid login" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    user: {
      email: user.email,
      role: user.role,
      plan: user.plan,
      premium: user.premium,
    }
  });
});

/* ======================
   Get All Users (Admin)
====================== */
app.get("/all-users", async (req, res) => {
  const users = await User.find();
  res.json({ success: true, users });
});

/* ======================
   Request Subscription
====================== */
app.post("/request-subscription", async (req, res) => {
  const { email, plan, phone, message } = req.body;

  await SubscriptionRequest.create({ email, plan, phone, message });

  res.json({ success: true, message: "Request sent. Await activation." });
});

/* ======================
   View Requests (Admin)
====================== */
app.get("/subscription-requests", async (req, res) => {
  const requests = await SubscriptionRequest.find();
  res.json({ success: true, requests });
});

/* ======================
   Approve Subscription
====================== */
app.post("/approve-request", async (req, res) => {
  const { requestId } = req.body;

  const reqDoc = await SubscriptionRequest.findById(requestId);
  if (!reqDoc) {
    return res.status(404).json({ success: false });
  }

  const user = await User.findOne({ email: reqDoc.email });

  if (user) {
    let duration = 30; // default monthly
    if (reqDoc.plan === "weekly") duration = 7;
    if (reqDoc.plan === "vip") duration = 30;

    user.plan = reqDoc.plan;
    user.premium = true;
    user.expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    await user.save();
  }

  reqDoc.status = "approved";
  await reqDoc.save();

  res.json({ success: true, message: "User activated" });
});

/* ======================
   Create Slip
====================== */
app.post("/slips", async (req, res) => {
  const { date, games, access, totalOdds } = req.body;

  if (totalOdds < 2) {
    return res.json({ success: false, message: "Minimum total odds is 2" });
  }

  const slip = await Slip.create({
    date,
    games,
    access,
    totalOdds
  });

  res.json({ success: true, slip });
});

/* ======================
   Get Slips
====================== */
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

/* ======================
   Update Game Result
====================== */
app.post("/slip-result", async (req, res) => {
  const { slipId, gameIndex, result } = req.body;

  const slip = await Slip.findById(slipId);
  if (!slip) {
    return res.status(404).json({ success: false });
  }

  slip.games[gameIndex].result = result;
  await slip.save();

  res.json({ success: true });
});

/* ======================
   Serve Frontend
====================== */
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

/* ======================
   Start Server
====================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));