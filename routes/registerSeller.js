const express = require("express");
const db = require("../conf/db");

const router = express.Router();

// Add user via form POST
router.post("/add-user", async (req, res) => {
  try {
    const { name, email, password, phone, location } = req.body;

    if (!name || !email || !password || !phone || !location) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const sql = `
      INSERT INTO sellers
      (name, email, password, phone, location)
      VALUES (?, ?, ?, ?, ?)
    `;

    await db.query(sql, [name, email, password, phone, location]);

    res.json({ success: true, message: "User added successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/all-sellers", async (req, res) => {
  try {
    db.query("SELECT * FROM sellers;", (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database query failed." });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "No sellers found." });
      }

      res.json(results);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
