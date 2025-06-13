// const express = require("express");
// const app = express();
// const cors = require("cors");
// const path = require("path");

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // 🔥 Mount the route correctly
// const productRouter = require("./routes/products");
// app.use("/products", productRouter);
// const categoryRouter = require("./routes/categoryRoutes");
// app.use("/categories", categoryRouter);
// const adminRouter = require("./routes/adminRouter");
// app.use("/admin", adminRouter);
// const bannerRouter = require("./routes/bannerRouter");
// app.use("/banners", bannerRouter);

// app.listen(5000, () => console.log("Server running on http://localhost:5000"));

const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folders
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🚀 Serve React static files
app.use(express.static(path.join(__dirname, "build")));

// API routes
const productRouter = require("./routes/products");
app.use("/products", productRouter);
const categoryRouter = require("./routes/categoryRoutes");
app.use("/categories", categoryRouter);
const adminRouter = require("./routes/adminRouter");
app.use("/admin", adminRouter);
const bannerRouter = require("./routes/bannerRouter");
app.use("/banners", bannerRouter);

// 🎯 Catch-all route to serve React frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start server
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
