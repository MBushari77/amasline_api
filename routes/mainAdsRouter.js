const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../conf/db");

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

/**
 * CREATE: Add a new main ad
 * POST /
 */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, text, path: adPath } = req.body;
    const image = req.file?.filename;

    if (!title || !image) {
      return res
        .status(400)
        .json({ success: false, message: "Title and image are required." });
    }

    const sql = `INSERT INTO main_ads (image, title, text, path) VALUES (?, ?, ?, ?)`;
    await db.query(sql, [image, title, text, adPath]);

    res.json({ success: true, message: "Main ad created." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * READ ALL: Get all main ads
 * GET /
 */
router.get("/all", async (req, res) => {
  try {
    db.query("SELECT * FROM main_ads", (error, result) => {
      if (error) {
        res.send({ success: false });
        throw error;
      }
      res.send(result);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * READ ONE: Get single ad by ID
 * GET //:id
 */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM main_ads WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Ad not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * UPDATE: Update ad details (with optional new image)
 * PUT //:id
 */
router.put("/:id", upload.single("image"), (req, res) => {
  const { title, text, path: adPath } = req.body;
  const id = req.params.id;

  // First get the existing ad by id
  db.query("SELECT * FROM main_ads WHERE id = ?", [id], (error, existing) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    let image = existing[0].image;

    // If there's a new file, delete old and update image
    if (req.file) {
      const oldPath = `uploads/${image}`;
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      image = req.file.filename;
    }

    const sql = `UPDATE main_ads SET image=?, title=?, text=?, path=? WHERE id=?`;
    db.query(
      sql,
      [image, title, text, adPath, id],
      (updateError, updateResult) => {
        if (updateError) {
          console.error(updateError);
          return res
            .status(500)
            .json({ success: false, error: updateError.message });
        }

        if (updateResult.affectedRows === 0) {
          return res
            .status(400)
            .json({ success: false, message: "Update failed" });
        }

        res.json({ success: true, message: "Ad updated." });
      }
    );
  });
});

/**
 * DELETE: Remove ad and its image
 * DELETE //:id
 */
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  // Step 1: Find the ad by id
  db.query("SELECT * FROM main_ads WHERE id = ?", [id], (selectErr, rows) => {
    if (selectErr) {
      console.error(selectErr);
      return res.status(500).json({ success: false, error: selectErr.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    // Step 2: Delete old image if exists
    const imagePath = `uploads/${rows[0].image}`;
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Step 3: Delete the ad from database
    db.query(
      "DELETE FROM main_ads WHERE id = ?",
      [id],
      (deleteErr, deleteResult) => {
        if (deleteErr) {
          console.error(deleteErr);
          return res
            .status(500)
            .json({ success: false, error: deleteErr.message });
        }

        if (deleteResult.affectedRows === 0) {
          return res
            .status(400)
            .json({ success: false, message: "Delete failed" });
        }

        res.json({ success: true, message: "Ad deleted." });
      }
    );
  });
});

module.exports = router;
