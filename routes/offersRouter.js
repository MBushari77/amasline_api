// routes/offers.js

const express = require("express");
const db = require("../conf/db");

const router = express.Router();

// Add new offer
router.post("/add", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const sql = `INSERT INTO offers (title) VALUES (?)`;
  db.query(sql, [title], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      success: true,
      message: "Offer added",
      offerId: result.insertId,
    });
  });
});

// Get all offers
router.get("/all", (req, res) => {
  db.query("SELECT * FROM offers", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get offer by id
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM offers WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Offer not found" });
    res.json(results[0]);
  });
});

// Update offer
router.post("/update/:id", (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const sql = `UPDATE offers SET title = ? WHERE id = ?`;
  db.query(sql, [title, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Offer updated" });
  });
});

// Delete offer
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM offers WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Offer deleted" });
  });
});

module.exports = router;
