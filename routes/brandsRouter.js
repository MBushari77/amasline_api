// routes/brands.js
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

// Add a new brand
router.post("/add", upload.single("icon"), (req, res) => {
  const { name } = req.body;
  const icon = req.file?.filename || null;

  if (!name || !icon) {
    return res.status(400).json({ error: "Name and icon are required." });
  }

  const sql = `INSERT INTO brands (name, icon) VALUES (?, ?)`;
  db.query(sql, [name, icon], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      success: true,
      message: "Brand added successfully",
      brandId: result.insertId,
    });
  });
});

// Get all brands
router.get("/all", (req, res) => {
  db.query("SELECT * FROM brands", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get brand by id
router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM brands WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) {
      return res.status(404).json({ message: "Brand not found" });
    }
    res.json(results[0]);
  });
});

// Delete brand (and its icon)
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT icon FROM brands WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const { icon } = results[0];
    const filePath = path.join(__dirname, "..", "uploads", icon);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT")
        console.error("File deletion error:", err);
    });

    db.query("DELETE FROM brands WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Brand and icon deleted" });
    });
  });
});

// Update brand
router.post("/update/:id", upload.single("icon"), (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const icon = req.file?.filename;

  const updateFields = ["name = ?"];
  const values = [name];

  if (icon) {
    updateFields.push("icon = ?");
    values.push(icon);
  }

  values.push(id);

  const sql = `UPDATE brands SET ${updateFields.join(", ")} WHERE id = ?`;
  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Brand updated successfully" });
  });
});

module.exports = router;
