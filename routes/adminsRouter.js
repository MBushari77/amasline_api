const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../conf/db");
const fs = require("fs");

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Add a new admin/subadmin
router.post("/add", upload.single("img"), (req, res) => {
  const { name, username, email, password, about, type } = req.body;
  const img = req.file?.filename || null;

  if (!name || !username || !email || !password || !about || !img || !type) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (type !== "admin" && type !== "subadmin") {
    return res
      .status(400)
      .json({ error: "Invalid type. Must be admin or subadmin." });
  }

  const sql = `
    INSERT INTO admins (name, username, email, password, about, img, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [name, username, email, password, about, img, type],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        message: "Admin added",
        adminId: result.insertId,
      });
    }
  );
});

// Get all admins
router.get("/all", (req, res) => {
  db.query("SELECT * FROM admins", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get admin by ID
router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM admins WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Admin not found" });
    res.json(results[0]);
  });
});

// Delete admin and their image
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT img FROM admins WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Admin not found" });

    const { img } = results[0];
    const filePath = path.join(__dirname, "..", "uploads", img);

    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT")
        console.error("File deletion error:", err);
    });

    db.query("DELETE FROM admins WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Admin and image deleted" });
    });
  });
});

module.exports = router;
