const express = require("express");
const jwt = require("jsonwebtoken");
const Detection = require("../models/Detection");

const router = express.Router();

// Middleware to check authentication
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Get user history
router.get("/history", async (req, res) => {
  try {
    const history = await ImageAnalysis.find().sort({ analyzedAt: -1 }); // Sort by latest analysis
    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ message: "Error fetching history." });
  }
});


// Clear history
router.delete("/", authenticateUser, async (req, res) => {
  try {
    await Detection.deleteMany({ userId: req.userId });
    res.json({ message: "History cleared" });
  } catch (error) {
    res.status(500).json({ message: "Error clearing history" });
  }
});

module.exports = router;
