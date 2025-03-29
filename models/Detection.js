const mongoose = require("mongoose");

const DetectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  imageName: { type: String, required: true },
  result: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Detection", DetectionSchema);
