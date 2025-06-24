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
    tags,
  } = req.body;

  let sizeArray = [];
  let colorArray = [];
  let tagArray = [];

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

  try {
    tagArray = JSON.parse(tags || "[]");
  } catch {
    tagArray = [];
  }

  const images = (req.files["images"] || []).map((file) => file.filename);
  const usageImages = (req.files["usageImages"] || []).map(
    (file) => file.filename
  );

  const sql = `
    INSERT INTO products 
    (name, model, price, offerPrice, stock, description, warranty, images, usageImages, sizes, colors, category_id, vendor, tags) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name || null,
      model || null,
      Number(price),
      Number(offerPrice) || null,
      Number(stock),
      description || null,
      warranty || null,
      JSON.stringify(images),
      JSON.stringify(usageImages),
      JSON.stringify(sizeArray),
      JSON.stringify(colorArray),
      category_id,
      Number(vendor),
      JSON.stringify(tagArray),
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

router.put("/update-product/:id", multiUpload, (req, res) => {
  const { id } = req.params;
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
    tags, // <-- Add tags here
    category_id,
    vendor,
  } = req.body;

  let sizeArray = [];
  let colorArray = [];
  let tagArray = []; // <-- Add tags array

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

  try {
    tagArray = JSON.parse(tags || "[]"); // <-- Parse tags here
  } catch {
    tagArray = [];
  }

  const newImages = (req.files["images"] || []).map((file) => file.filename);
  const newUsageImages = (req.files["usageImages"] || []).map(
    (file) => file.filename
  );

  const selectSql = "SELECT images, usageImages FROM products WHERE id = ?";
  db.query(selectSql, [id], (selectErr, result) => {
    if (selectErr) return res.status(500).json({ error: selectErr.message });
    if (result.length === 0)
      return res.status(404).json({ message: "Product not found" });

    const current = result[0];
    const images = newImages.length
      ? JSON.stringify(newImages)
      : current.images;
    const usageImages = newUsageImages.length
      ? JSON.stringify(newUsageImages)
      : current.usageImages;

    const updateSql = `
      UPDATE products SET 
        name = ?, model = ?, price = ?, offerPrice = ?, stock = ?, 
        description = ?, warranty = ?, images = ?, usageImages = ?, 
        sizes = ?, colors = ?, tags = ?, category_id = ?, vendor = ?
      WHERE id = ?
    `;

    db.query(
      updateSql,
      [
        name || null,
        model || null,
        Number(price),
        Number(offerPrice) || null,
        Number(stock),
        description || null,
        warranty || null,
        images,
        usageImages,
        JSON.stringify(sizeArray),
        JSON.stringify(colorArray),
        JSON.stringify(tagArray), // <-- Add tags here
        category_id,
        Number(vendor),
        id,
      ],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Product updated successfully" });
      }
    );
  });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // Step 1: Get images and usageImages to delete from filesystem
  const selectSql = "SELECT images, usageImages FROM products WHERE id = ?";
  db.query(selectSql, [id], (selectErr, result) => {
    if (selectErr) return res.status(500).json({ error: selectErr.message });
    if (result.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const product = result[0];

    const deleteSql = "DELETE FROM products WHERE id = ?";
    db.query(deleteSql, [id], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ error: deleteErr.message });

      // Step 2: Delete files from uploads folder
      const images = JSON.parse(product.images || "[]");
      const usageImages = JSON.parse(product.usageImages || "[]");

      [...images, ...usageImages].forEach((filename) => {
        const filePath = path.join(__dirname, "../uploads", filename);
        fs.unlink(filePath, (fsErr) => {
          if (fsErr && fsErr.code !== "ENOENT") {
            console.error("Error deleting file:", fsErr);
          }
        });
      });

      res.json({ success: true, message: "Product deleted successfully" });
    });
  });
});

router.put("/:id/images", upload.array("images", 10), (req, res) => {
  const { id } = req.params;
  const { orderedImages = "[]" } = req.body;

  let updatedImages = [];
  try {
    updatedImages = JSON.parse(orderedImages);
  } catch {
    return res.status(400).json({ error: "Invalid orderedImages format" });
  }

  // Step 1: Upload new images (req.files)
  const newlyUploaded = req.files.map((file) => file.filename);
  newlyUploaded.forEach((file) => {
    if (!updatedImages.includes(file)) {
      updatedImages.push(file);
    }
  });

  // Step 2: Get current images from DB
  db.query("SELECT images FROM products WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0)
      return res.status(404).json({ message: "Product not found" });

    const currentImages = JSON.parse(result[0].images || "[]");

    // Step 3: Find removed images and delete from filesystem
    const removedImages = currentImages.filter(
      (img) => !updatedImages.includes(img)
    );
    removedImages.forEach((filename) => {
      const filePath = path.join(__dirname, "../uploads", filename);
      fs.unlink(filePath, (fsErr) => {
        if (fsErr && fsErr.code !== "ENOENT") {
          console.error("Failed to delete file:", fsErr);
        }
      });
    });

    // Step 4: Update DB with new ordered images
    db.query(
      "UPDATE products SET images = ? WHERE id = ?",
      [JSON.stringify(updatedImages), id],
      (updateErr) => {
        if (updateErr)
          return res.status(500).json({ error: updateErr.message });
        res.json({
          success: true,
          message: "Product images updated",
          images: updatedImages,
        });
      }
    );
  });
});

// Update usageImages only
router.put("/:id/usage-images", upload.array("usageImages", 10), (req, res) => {
  const { id } = req.params;
  const { orderedUsageImages = "[]" } = req.body;

  let updatedUsageImages = [];
  try {
    updatedUsageImages = JSON.parse(orderedUsageImages);
  } catch {
    return res.status(400).json({ error: "Invalid orderedUsageImages format" });
  }

  const newlyUploaded = req.files.map((file) => file.filename);
  newlyUploaded.forEach((file) => {
    if (!updatedUsageImages.includes(file)) {
      updatedUsageImages.push(file);
    }
  });

  // Get current usageImages from DB
  db.query(
    "SELECT usageImages FROM products WHERE id = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0)
        return res.status(404).json({ message: "Product not found" });

      const currentUsageImages = JSON.parse(result[0].usageImages || "[]");

      // Find removed usageImages and delete from filesystem
      const removedUsageImages = currentUsageImages.filter(
        (img) => !updatedUsageImages.includes(img)
      );
      removedUsageImages.forEach((filename) => {
        const filePath = path.join(__dirname, "../uploads", filename);
        fs.unlink(filePath, (fsErr) => {
          if (fsErr && fsErr.code !== "ENOENT") {
            console.error("Failed to delete file:", fsErr);
          }
        });
      });

      // Update DB with new usageImages
      db.query(
        "UPDATE products SET usageImages = ? WHERE id = ?",
        [JSON.stringify(updatedUsageImages), id],
        (updateErr) => {
          if (updateErr)
            return res.status(500).json({ error: updateErr.message });
          res.json({
            success: true,
            message: "Usage images updated",
            usageImages: updatedUsageImages,
          });
        }
      );
    }
  );
});

module.exports = router;
