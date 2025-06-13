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

// Add a new category
router.post(
  "/add",
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  (req, res) => {
    const { name, shortInfo, description } = req.body;

    const icon = req.files?.icon?.[0]?.filename || null;
    const banner = req.files?.banner?.[0]?.filename || null;

    if (!name || !shortInfo || !description || !icon || !banner) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const sql = `
      INSERT INTO categories (name, shortInfo, description, icon, banner)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(
      sql,
      [name, shortInfo, description, icon, banner],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          success: true,
          message: "Category added",
          categoryId: result.insertId,
        });
      }
    );
  }
);

// Get all categories
router.get("/all", (req, res) => {
  db.query("SELECT * FROM categories", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get category by ID
router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM categories WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Category not found" });
    res.json(results[0]);
  });
});

// Delete category and its images
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT icon, banner FROM categories WHERE id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!results.length)
        return res.status(404).json({ message: "Category not found" });

      const { icon, banner } = results[0];

      [icon, banner].forEach((filename) => {
        const filePath = path.join(__dirname, "..", "uploads", filename);
        fs.unlink(filePath, (err) => {
          if (err && err.code !== "ENOENT")
            console.error("File deletion error:", err);
        });
      });

      db.query("DELETE FROM categories WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Category and images deleted" });
      });
    }
  );
});

module.exports = router;
