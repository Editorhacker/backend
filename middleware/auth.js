const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure you have a valid secret key
    req.user = decoded; // Attach user to request
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid token." });
  }
};
