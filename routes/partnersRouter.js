const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../conf/db");
const fs = require("fs");

const router = express.Router();

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Add new partner
router.post("/add", upload.single("icon"), (req, res) => {
  const { name, path: partnerPath } = req.body;
  const icon = req.file?.filename;

  if (!name || !partnerPath || !icon) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const sql = `
      INSERT INTO partners (name, icon, path)
      VALUES (?, ?, ?)
    `;

  db.query(sql, [name, icon, partnerPath], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      success: true,
      message: "Partner added",
      partnerId: result.insertId,
    });
  });
});

// Get all partners
router.get("/all", (req, res) => {
  db.query("SELECT * FROM partners", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get partner by ID
router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM partners WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Partner not found" });
    res.json(results[0]);
  });
});

// Delete partner and its image
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT icon FROM partners WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Partner not found" });

    const { icon } = results[0];
    const filePath = path.join(__dirname, "..", "uploads", icon);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT")
        console.error("File deletion error:", err);
    });

    db.query("DELETE FROM partners WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Partner deleted" });
    });
  });
});

// Update partner
router.post("/update/:id", upload.single("icon"), (req, res) => {
  const { id } = req.params;
  const { name, path: partnerPath } = req.body;
  const icon = req.file?.filename;

  const updateFields = ["name = ?", "path = ?"];
  const values = [name, partnerPath];

  if (icon) {
    updateFields.push("icon = ?");
    values.push(icon);
  }

  values.push(id);

  const sql = `UPDATE partners SET ${updateFields.join(", ")} WHERE id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Partner updated" });
  });
});

module.exports = router;
