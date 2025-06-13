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

// Handle both images and usageImages
const multiUpload = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "usageImages", maxCount: 10 },
]);
router.post("/add-product", multiUpload, (req, res) => {
  const {
    name,
    model,
    price,
    offerPrice,
    stock,
    description,
    warranty,
    sizes,
    colors,
    category_id,
    vendor,
  } = req.body;

  let sizeArray = [];
  let colorArray = [];

  try {
    sizeArray = JSON.parse(sizes || "[]");
  } catch {
    sizeArray = [];
  }

  try {
    colorArray = JSON.parse(colors || "[]");
  } catch {
    colorArray = [];
  }
  const images = (req.files["images"] || []).map((file) => file.filename);

  const usageImages = (req.files["usageImages"] || []).map(
    (file) => file.filename
  );

  const sql = `
    INSERT INTO products 
    (name, model, price, offerPrice, stock, description, warranty, images, usageImages, sizes, colors, category_id, vendor) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name || null,
      model || null,
      Number(price), // already integer
      Number(offerPrice) || null, // optional integer
      Number(stock), // already integer
      description || null,
      warranty || null,
      JSON.stringify(images),
      JSON.stringify(usageImages),
      JSON.stringify(sizeArray),
      JSON.stringify(colorArray),
      category_id, // assumed integer
      Number(vendor), // already integer
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        message: "Product added successfully",
        productId: result.insertId,
      });
    }
  );
});

router.get("/one/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM products WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product: result[0] });
  });
});

router.get("/all", (req, res) => {
  const sql = "SELECT * FROM products";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, products: results });
  });
});

module.exports = router;
