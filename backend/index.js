require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI);

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  premium: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  plan: { type: String, default: null },
  expiresAt: { type: Date, default: null },
});

const User = mongoose.model("User", userSchema);

// auto expire
app.use(async (req, res, next) => {
  const now = new Date();
  await User.updateMany(
    { premium: true, expiresAt: { $lt: now } },
    { premium: false, approved: false, plan: null, expiresAt: null }
  );
  next();
});

// test route
app.get("/api", (req, res) => {
  res.json({ message: "TipStorm backend running" });
});

// all users
app.get("/all-users/:adminEmail", async (req, res) => {
  const admin = await User.findOne({ email: req.params.adminEmail });
  if (!admin || admin.role !== "admin")
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const users = await User.find();
  res.json({ success: true, users });
});

// approve
app.post("/api/approve-user", async (req, res) => {
  const { adminEmail, userEmail } = req.body;

  const admin = await User.findOne({ email: adminEmail });
  if (!admin || admin.role !== "admin")
    return res.status(403).json({ success: false, message: "Unauthorized" });

  const user = await User.findOne({ email: userEmail });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  user.approved = true;
  await user.save();

  res.json({ success: true, message: "approved" });
});

// activate
app.post("/api/activate", async (req, res) => {
  const { adminEmail, userEmail, plan } = req.body;

  const admin = await User.findOne({ email: adminEmail });
  if (!admin || admin.role !== "admin")
    return res.status(403).json({ success: false, message: "Unauthorized" });

  const user = await User.findOne({ email: userEmail });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  user.plan = plan;
  user.premium = plan !== "free";
  user.expiresAt = plan !== "free" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

  await user.save();

  res.json({ success: true, message: "activated" });
});

// frontend
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// start
const PORT = process.env.PORT || 5000;
app.listen(PORT); 
