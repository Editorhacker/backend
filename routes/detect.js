const express = require("express");
const fs = require("fs");
const sharp = require("sharp");
const exifParser = require("exif-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const upload = require("../middleware/multerConfig");

const router = express.Router();

// ✅ MongoDB Connection
mongoose.connect("mongodb+srv://detect:detect@ai.tmjbl6h.mongodb.net/AI-Detector", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ✅ Define Schema
const ImageAnalysis = mongoose.model("ImageAnalysis", new mongoose.Schema({
  filename: String,
  format: String,
  metadata: Object,
  isOriginal: Boolean,
  message: String,
  analyzedAt: { type: Date, default: Date.now },
}));

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded." });
    }

    // ✅ Get file format
    const fileFormat = req.file.mimetype.split("/")[1].toLowerCase();
    const supportedFormats = ["jpeg", "jpg", "png", "webp", "raw"];

    if (!supportedFormats.includes(fileFormat)) {
      return res.status(400).json({ message: "Unsupported file format." });
    }

    // ✅ Read file buffer
    const buffer = await fs.promises.readFile(req.file.path);

    let metadata = {};
    
    if (fileFormat === "jpeg" || fileFormat === "jpg") {
      try {
        const parser = exifParser.create(buffer);
        const exifData = parser.parse().tags;
        metadata = {
          Make: exifData.Make || null,
          Model: exifData.Model || null,
          FNumber: exifData.FNumber || null,
          ExposureTime: exifData.ExposureTime || null,
          ISO: exifData.ISO || null,
          FocalLength: exifData.FocalLength || null,
        };
      } catch (exifError) {
        console.warn("EXIF parsing failed:", exifError.message);
      }
    } else {
      try {
        // ✅ Extract metadata for PNG, WEBP, RAW images
        const imageMetadata = await sharp(buffer).metadata();
        metadata = {
          Make: imageMetadata.make || null,
          Model: imageMetadata.model || null,
          FNumber: imageMetadata.FNumber || null,
          ExposureTime: imageMetadata.ExposureTime || null,
          ISO: imageMetadata.ISO || null,
          FocalLength: imageMetadata.FocalLength || null,
        };
      } catch (sharpError) {
        console.warn("Metadata extraction failed:", sharpError.message);
      }
    }

    // ✅ AI-generated detection logic (Fix: Only check camera-related metadata)
    const hasCameraMetadata = Object.values(metadata).some((val) => val !== null);
    const isOriginal = hasCameraMetadata;
    const message = isOriginal
      ? "✅ Image is original (Captured by a real camera)."
      : "❌ Image appears to be AI-generated (No camera metadata found).";

    // ✅ Store result in MongoDB
    const analysis = new ImageAnalysis({
      filename: req.file.originalname,
      format: fileFormat,
      metadata,
      isOriginal,
      message,
    });

    await analysis.save();

    res.json({ message, metadata });

    // ✅ Cleanup: Delete file after processing
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ message: "Error analyzing image." });
  }
});

// ✅ Fetch history of analyses
router.get("/history", async (req, res) => {
  try {
    const history = await ImageAnalysis.find().sort({ analyzedAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ message: "Error fetching history." });
  }
});

module.exports = router;
