const express = require("express");
const upload = require("../middleware/multerConfig");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { format } = req.body; // Get format from frontend
    const originalPath = req.file.path;
    const newExt = format ? `.${format}` : ".png"; // Default to PNG

    const newFileName = `${Date.now()}${newExt}`;
    const newFilePath = path.join("uploads", newFileName); // ✅ Corrected path

    // Convert Image
    await sharp(originalPath)
      .toFormat(format)
      .toFile(newFilePath);

    fs.unlinkSync(originalPath); // Delete original file

    res.json({ message: "Conversion successful", newFile: `/uploads/${newFileName}` }); // ✅ Return correct URL
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, please try again." });
  }
});

module.exports = router;
