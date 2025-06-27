const express = require("express");
const router = express.Router();
const db = require("../conf/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const nodemailer = require("nodemailer");

// REGISTER
router.post("/register", async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    username,
    gender,
    city,
    area,
    building,
    flat,
  } = req.body;

  if (!email || !password || !username) {
    return res.json({ error: "Email, username, and password are required" });
  }

  try {
    db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username],
      async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
          return res.json({ error: "Email or username already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          `INSERT INTO users 
            (name, email, phone, password, username, gender, city, area, building, flat, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            name,
            email,
            phone,
            hashedPassword,
            username,
            gender,
            city,
            area,
            building,
            flat,
          ],
          (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
              success: true,
              message: "User registered successfully",
              userId: result.insertId,
            });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", (req, res) => {
  const { emailOrUsername, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ? OR username = ?",
    [emailOrUsername, emailOrUsername],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ error: "Incorrect password" });

      const token = jwt.sign({ id: user.id }, "your_secret_key", {
        expiresIn: "7d",
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
        },
      });
    }
  );
});

// GET USER BY ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user = result[0];
    delete user.password;
    res.json({ user });
  });
});

// UPDATE USER
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    password,
    username,
    gender,
    city,
    area,
    building,
    flat,
  } = req.body;

  try {
    const updatedFields = {
      name,
      email,
      phone,
      username,
      gender,
      city,
      area,
      building,
      flat,
    };

    if (password) {
      updatedFields.password = await bcrypt.hash(password, 10);
    }

    const keys = Object.keys(updatedFields).filter(
      (key) => updatedFields[key] !== undefined
    );
    const values = keys.map((key) => updatedFields[key]);

    const setQuery = keys.map((key) => `${key} = ?`).join(", ");

    const sql = `UPDATE users SET ${setQuery}, updated_at = NOW() WHERE id = ?`;
    values.push(id);

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "User updated successfully" });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EMAIL SENDING ROUTE
router.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res
      .status(400)
      .json({ error: "To, subject, and text are required" });
  }

  try {
    // Create transporter with your SMTP config
    let transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com", // Replace with your SMTP server
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: "sales@amasline.com", // Replace with your email
        pass: "LPIjLlBwR5]", // Replace with your email password or app password
      },
    });

    // Send mail
    await transporter.sendMail({
      from: '"Store Contact" <sales@amasline.com>', // sender address
      to, // receiver address (e.g. sales@amasline.com)
      subject, // Subject line
      text, // plain text body
      // html: "<b>Hello world?</b>" // if you want HTML email
    });

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

router.post("/:id/wishlist/add", (req, res) => {
  const userId = req.params.id;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  // Step 1: Get current wishlist
  db.query(
    "SELECT wishList FROM users WHERE id = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0)
        return res.status(404).json({ error: "User not found" });

      let wishlist = [];
      try {
        wishlist = JSON.parse(result[0].wishList || "[]");
      } catch {
        wishlist = [];
      }

      if (wishlist.includes(productId)) {
        return res.json({ success: true, message: "Already in wishlist" });
      }

      wishlist.push(productId);

      db.query(
        "UPDATE users SET wishList = ? WHERE id = ?",
        [JSON.stringify(wishlist), userId],
        (updateErr) => {
          if (updateErr)
            return res.status(500).json({ error: updateErr.message });
          res.json({
            success: true,
            message: "Added to wishlist",
            wishList: wishlist,
          });
        }
      );
    }
  );
});

router.post("/:id/wishlist/remove", (req, res) => {
  const userId = req.params.id;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  db.query(
    "SELECT wishList FROM users WHERE id = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0)
        return res.status(404).json({ error: "User not found" });

      let wishlist = [];
      try {
        wishlist = JSON.parse(result[0].wishList || "[]");
      } catch {
        wishlist = [];
      }

      wishlist = wishlist.filter((id) => id !== productId);

      db.query(
        "UPDATE users SET wishList = ? WHERE id = ?",
        [JSON.stringify(wishlist), userId],
        (updateErr) => {
          if (updateErr)
            return res.status(500).json({ error: updateErr.message });
          res.json({
            success: true,
            message: "Removed from wishlist",
            wishList: wishlist,
          });
        }
      );
    }
  );
});

router.get("/:id/wishlist/products", (req, res) => {
  const userId = req.params.id;

  db.query(
    "SELECT wishList FROM users WHERE id = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0)
        return res.status(404).json({ error: "User not found" });

      let wishlist = [];
      try {
        wishlist = JSON.parse(result[0].wishList || "[]");
      } catch {
        wishlist = [];
      }

      if (wishlist.length === 0) return res.json({ products: [] });

      const placeholders = wishlist.map(() => "?").join(",");
      db.query(
        `SELECT * FROM products WHERE id IN (${placeholders})`,
        wishlist,
        (err, products) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ products });
        }
      );
    }
  );
});

module.exports = router;
