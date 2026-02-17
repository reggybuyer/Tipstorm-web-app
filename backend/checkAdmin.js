require("dotenv").config();
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
});

const User = mongoose.model("User", userSchema);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const admin = await User.findOne({ role: "admin" });
    console.log("Admin user:", admin);
    mongoose.disconnect();
  })
  .catch(console.error); 
