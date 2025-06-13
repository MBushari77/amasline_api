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

/**
 * Add Admin
 */

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  const sql = "SELECT * FROM admin WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.json({ success: false, message: err.message });
    if (results.length === 0) {
      return res.json({
        success: false,
        error: "Invalid username or password",
      });
    }
    res.json({ success: true, message: "Login successful", admin: results[0] });
  });
});

router.post("/add", upload.single("image"), (req, res) => {
  const { name, username, email, password, about, type } = req.body;
  const image = req.file?.filename;

  if (!name || !username || !email || !password || !type) {
    return res.json({ error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO admin (name, username, email, password, about, image, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, username, email, password, about || "", image || "", type],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json({
        success: true,
        message: "Admin added",
        adminId: result.insertId,
      });
    }
  );
});

/**
 * Get All Admins
 */
router.get("/all", (req, res) => {
  db.query("SELECT * FROM admin", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/**
 * Get Admin by ID
 */
router.get("/:id", (req, res) => {
  const adminId = req.params.id;
  db.query("SELECT * FROM admin WHERE id = ?", [adminId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ message: "Admin not found" });
    res.json(results[0]);
  });
});

/**
 * Delete Admin (and remove image if any)
 */
router.delete("/:id", (req, res) => {
  const adminId = req.params.id;

  db.query(
    "SELECT image FROM admin WHERE id = ?",
    [adminId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ message: "Admin not found" });

      const imageFile = results[0].image;
      if (imageFile) {
        const imagePath = path.join(__dirname, "..", "uploads", imageFile);
        fs.unlink(imagePath, (err) => {
          if (err && err.code !== "ENOENT") {
            console.error(`Failed to delete image: ${imageFile}`, err);
          }
        });
      }

      db.query("DELETE FROM admin WHERE id = ?", [adminId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Admin deleted" });
      });
    }
  );
});

router.put("/:id/password", (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: "Password is required" });

  const sql = "UPDATE admin SET password = ? WHERE id = ?";
  db.query(sql, [password, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Password updated" });
  });
});

module.exports = router;
