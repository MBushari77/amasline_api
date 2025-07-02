// routes/reviews.js
const express = require("express");
const db = require("../conf/db");

const router = express.Router();

// Add a review
router.post("/", (req, res) => {
  const { productId, userId, username, stars, comment } = req.body;

  if (!productId || !userId || !username || !stars) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO reviews (productId, userId, username, stars, comment)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [productId, userId, username, stars, comment || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        message: "Review added",
        reviewId: result.insertId,
      });
    }
  );
});

// Get reviews for a product
router.get("/product/:productId", (req, res) => {
  const { productId } = req.params;

  const sql =
    "SELECT * FROM reviews WHERE productId = ? ORDER BY created_at DESC";
  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, reviews: results });
  });
});

// Delete a review
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM reviews WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Review deleted" });
  });
});

// Update a review (if you want)
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { stars, comment } = req.body;

  const sql = `
    UPDATE reviews SET
      stars = ?,
      comment = ?
    WHERE id = ?
  `;

  db.query(sql, [stars, comment, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Review updated" });
  });
});

module.exports = router;
