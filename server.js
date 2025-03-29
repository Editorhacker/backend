const express = require("express");
const multer = require("multer");
const fs = require("fs");
const sharp = require("sharp");
const exifParser = require("exif-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./model/User");

const app = express();
app.use(cors());
app.use(express.json());

// **Connect to MongoDB**
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://detect:detect@ai.tmjbl6h.mongodb.net//user")
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// **Multer Setup for Image Uploads**
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "./uploads";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

// **File Filter for Supported Image Formats**
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/tiff"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("❌ Unsupported file format. Only JPEG, PNG, WebP, and TIFF are allowed."), false);
    }
};

const upload = multer({ storage, fileFilter });

// **JWT Secret Key**
const SECRET_KEY = process.env.JWT_SECRET || "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// **User Registration**
app.post("/register", async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "❌ Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ fullName, email, password: hashedPassword });

        await newUser.save();
        res.status(201).json({ message: "✅ User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Error registering user", details: error });
    }
});

// **User Login**
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "❌ Invalid email or password" });
        }

        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ message: "✅ Login successful", token });
    } catch (error) {
        res.status(500).json({ error: "Error logging in", details: error });
    }
});

// **Function to Extract Metadata**
const extractMetadata = async (filePath, mimeType) => {
    try {
        const buffer = fs.readFileSync(filePath);
        let metadata = {};

        if (mimeType === "image/jpeg" || mimeType === "image/tiff") {
            const parser = exifParser.create(buffer);
            metadata = parser.parse().tags;
        } else {
            const sharpMetadata = await sharp(buffer).metadata();
            metadata = {
                Format: sharpMetadata.format,
                Width: sharpMetadata.width,
                Height: sharpMetadata.height,
                Depth: sharpMetadata.depth,
                Space: sharpMetadata.space
            };
        }

        return metadata;
    } catch (error) {
        console.error("Error extracting metadata:", error);
        return null;
    }
};

// **Upload Image & Check Metadata**
app.post("/upload", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "❌ No file uploaded" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    let metadata = await extractMetadata(filePath, mimeType);

    // Required EXIF metadata fields for originality check
    const requiredFields = ["Make", "Model", "FNumber", "ExposureTime", "ISO", "FocalLength"];
    const missingFields = metadata
        ? requiredFields.filter(field => !(field in metadata))
        : requiredFields;

    console.log("Extracted Metadata:", metadata);
    console.log("Missing Fields:", missingFields);

    const isOriginal = missingFields.length === 0;

    res.json({
        metadata: metadata || "No metadata available",
        isOriginal: isOriginal ? "✅ Original Image" : "❌ AI-Generated Image",
        missingFields: missingFields.length > 0 ? missingFields : "None"
    });

    // Delete uploaded file after processing
    setTimeout(() => {
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
        });
    }, 5000);
});

// **Start Server**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
