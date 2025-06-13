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

// Add new banner
router.post("/add", upload.single("image"), (req, res) => {
  const { title, about, tagline, path: bannerPath, active } = req.body;
  const imageUrl = req.file?.filename || null;

  if (!title || !about || !tagline || !bannerPath || !imageUrl) {
    return res.json({ error: "All fields are required." });
  }

  const sql = `
    INSERT INTO banners (title, about, tagline, imageUrl, path, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [title, about, tagline, imageUrl, bannerPath, 1],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json({
        success: true,
        message: "Banner added",
        bannerId: result.insertId,
      });
    }
  );
});

// Get all banners
router.get("/all", (req, res) => {
  db.query("SELECT * FROM banners", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get banner by ID
router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM banners WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Banner not found" });
    res.json(results[0]);
  });
});

// Delete banner and image
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT imageUrl FROM banners WHERE id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!results.length)
        return res.status(404).json({ message: "Banner not found" });

      const { imageUrl } = results[0];
      const filePath = path.join(__dirname, "..", "uploads", imageUrl);

      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT")
          console.error("File deletion error:", err);
      });

      db.query("DELETE FROM banners WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Banner and image deleted" });
      });
    }
  );
});

// Toggle banner active status
router.patch("/:id/active", (req, res) => {
  const id = req.params.id;
  const { active } = req.body;

  db.query(
    "UPDATE banners SET active = ? WHERE id = ?",
    [active, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, active });
    }
  );
});

module.exports = router;
