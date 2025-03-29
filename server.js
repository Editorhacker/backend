const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const detectRoute = require("./routes/detect"); // Ensure this path is correct
const userRoutes = require("./routes/auth");
const historyRoutes = require("./routes/history");
const convertRoutes = require("./routes/convert");

require("dotenv").config(); // Load .env variables at the top


const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uploadDir = path.join(__dirname, "uploads");

// ✅ Serve static files correctly
app.use("/uploads", express.static(uploadDir))

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((error) => console.error("❌ MongoDB Connection Error:", error));


// API Routes
app.use("/api/detect", detectRoute); // ✅ Make sure this line exists
app.use("/api/auth", userRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/convert", convertRoutes);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
