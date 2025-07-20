const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../conf/db");

const router = express.Router();

// ----------------------
// Multer Setup
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".mp4", ".mov", ".avi", ".webm"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

// ----------------------
// CREATE
// ----------------------
router.post("/add", upload.single("video"), (req, res) => {
  console.log(req.body);
  const { title, model, description } = req.body;
  const videoUrl = req.file?.filename || null;

  const sql = `
    INSERT INTO video_products (title, model, description, videoUrl)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [title, model, description, videoUrl], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      success: true,
      message: "Video product added successfully",
      productId: result.insertId,
    });
  });
});

// ----------------------
// READ: Get One
// ----------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM video_products WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) {
      return res.status(404).json({ message: "Video product not found" });
    }

    res.json({ success: true, product: result[0] });
  });
});

// ----------------------
// READ: Get All
// ----------------------
router.get("/", (req, res) => {
  db.query("SELECT * FROM video_products ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ success: true, products: results });
  });
});

// ----------------------
// UPDATE
// ----------------------
router.put("/update/:id", upload.single("video"), (req, res) => {
  const { id } = req.params;
  const { title, model, description } = req.body;
  const newVideo = req.file?.filename;

  // Get existing video filename
  db.query(
    "SELECT videoUrl FROM video_products WHERE id = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0)
        return res.status(404).json({ message: "Not found" });

      const oldVideo = result[0].videoUrl;

      const sql = `
      UPDATE video_products 
      SET title = ?, model = ?, description = ?, videoUrl = ?
      WHERE id = ?
    `;

      db.query(
        sql,
        [title, model, description, newVideo || oldVideo, id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Delete old video if replaced
          if (newVideo && oldVideo) {
            const filePath = path.join(
              __dirname,
              "../uploads/videos",
              oldVideo
            );
            fs.unlink(filePath, (fsErr) => {
              if (fsErr && fsErr.code !== "ENOENT") {
                console.error("Error deleting old video:", fsErr);
              }
            });
          }

          res.json({ success: true, message: "Video product updated" });
        }
      );
    }
  );
});

// ----------------------
// DELETE: One
// ----------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // Step 1: Get current video filename
  db.query(
    "SELECT videoUrl FROM video_products WHERE id = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0)
        return res.status(404).json({ message: "Video product not found" });

      const videoFile = result[0].videoUrl;

      // Step 2: Delete DB row
      db.query("DELETE FROM video_products WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Step 3: Delete video file
        if (videoFile) {
          const filePath = path.join(__dirname, "../uploads/videos", videoFile);
          fs.unlink(filePath, (fsErr) => {
            if (fsErr && fsErr.code !== "ENOENT") {
              console.error("Error deleting video file:", fsErr);
            }
          });
        }

        res.json({ success: true, message: "Video product deleted" });
      });
    }
  );
});

// ----------------------
// BATCH DELETE
// ----------------------
router.post("/batch-delete", (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Provide an array of IDs" });
  }

  const placeholders = ids.map(() => "?").join(",");
  const selectSql = `SELECT videoUrl FROM video_products WHERE id IN (${placeholders})`;

  db.query(selectSql, ids, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const deleteSql = `DELETE FROM video_products WHERE id IN (${placeholders})`;

    db.query(deleteSql, ids, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      results.forEach(({ videoUrl }) => {
        if (videoUrl) {
          const filePath = path.join(__dirname, "../uploads/videos", videoUrl);
          fs.unlink(filePath, (fsErr) => {
            if (fsErr && fsErr.code !== "ENOENT") {
              console.error("Failed to delete:", videoUrl);
            }
          });
        }
      });

      res.json({
        success: true,
        message: `Deleted ${results.length} video products`,
      });
    });
  });
});

module.exports = router;
