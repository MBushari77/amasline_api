const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../conf/db");
const xlsx = require("xlsx");
const fs = require("fs");

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Category name → ID
const categoryMap = {
  Watches: 6,
  Fragrances: 11,
  ACCESSORIES: 12,
  Wallets: 14,
  Glasses: 15,
  Pens: 16,
  "Choose your gift": 17,
};

// Vendor name → ID
const vendorMap = {
  "amas line": 11, // maps to Kaper
  bushari: 1,
  ihssan: 2,
  Majid: 12,
};

// Custom parser for [black], [red, green, blue] style strings
function safeParseArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    const trimmed = str.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const content = trimmed.slice(1, -1);
      if (!content) return [];
      return content
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }
  return [];
}

// Upload Excel route
router.post("/upload-excel", upload.single("file"), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    for (const row of jsonData) {
      const name = row.name || "";
      const model = row.model || "";
      const price = Number(row.price || 0);
      const offerPrice = Number(row.offerPrice || 0);
      const stock = Number(row.stock || 0);
      const description = row.description || "";
      const warranty = row.warranty || "";

      const sizesArr = safeParseArray(row.sizes);
      const colorsArr = safeParseArray(row.colors);

      const sizes = JSON.stringify(sizesArr);
      const colors = JSON.stringify(colorsArr);

      let tags = "[]";
      try {
        tags = JSON.stringify([row.tags]);
      } catch {
        tags = "[]";
      }

      const images = JSON.stringify(row.images ? [row.images] : []);
      const usageImages = JSON.stringify(
        row.usageImages ? [row.usageImages] : []
      );

      let category_id = 1;
      if (row.category_id) {
        const cleanCategory = row.category_id.trim();
        category_id = categoryMap[cleanCategory] || 1;
      }

      let vendor = 1;
      if (row.vendor) {
        const cleanVendor = row.vendor.trim().toLowerCase();
        vendor = vendorMap[cleanVendor] || 1;
      }

      const offer = Number(row.offer || 0);

      const sql = `
        INSERT INTO products
        (name, model, price, offerPrice, stock, description, warranty, images, usageImages, sizes, colors, category_id, vendor, tags, offer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.query(sql, [
        name,
        model,
        price,
        offerPrice,
        stock,
        description,
        warranty,
        images,
        usageImages,
        sizes,
        colors,
        category_id,
        vendor,
        tags,
        offer,
      ]);
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Excel products imported successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
