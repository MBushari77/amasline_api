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
  watches: 6,
  fragrances: 11,
  accessories: 12,
  wallets: 14,
  glasses: 15,
  pens: 16,
  "choose your gift": 17,
};

// Vendor name → ID
const vendorMap = {
  "amas line": 11,
  bushari: 1,
  ihssan: 2,
  majid: 12,
};

// Brand name → ID
const brandMap = {
  aigner: 2,
  "estee lauder": 8,
  "graff art perfume": 9,
  tiffany: 10,
  "tom ford": 11,
  chanel: 12,
  "hugo boss": 14,
  "jean paul gaultier": 16,
  "calvin klein": 17,
  davidoff: 18,
  lacoste: 19,
  "mercedes benz": 20,
  "mont blanc": 21,
  "yves saint laurent": 22,
  byredo: 23,
  "lorenzo villoresi": 25,
  "the merchant of venice": 26,
  valentino: 27,
  "valentino voce vivo": 28,
  "alfred ritchy": 31,
  aramis: 36,
  atkinsons: 37,
  azzaro: 38,
  baldessarini: 39,
  bentley: 40,
  "bois 1920": 42,
  borntostandout: 43,
  "saint honore": 44,
  police: 45,
  montegrappa: 46,
  "guy la roche": 47,
  guess: 48,
  "gf ferre": 49,
  "emporio armani": 50,
  "cerruti 1881": 52,
  cartier: 55,
  chopard: 57,
  fendi: 58,
  "porsche design": 61,
  "women'secret eau": 64,
  "mystery de": 66,
  brands: 67,
  "christian dior": 68,
  hermes: 73,
  "lengl ing": 78,
  "min new york": 80,
  "abercrombie & fitch": 83,
  "alexandre j": 84,
  "acqua di monacco": 85,
  "amore segreto": 87,
  amouage: 88,
  "annick goutal": 89,
  aromadonna: 91,
  axrex: 92,
  baron: 95,
  boadicea: 97,
  bohoboco: 98,
  burberry: 99,
  bvlgari: 100,
  cacharel: 103,
  "carolina herrera": 105,
  caron: 106,
  clinique: 107,
  "clive christian": 108,
  creed: 109,
  "designer shaik": 110,
  diptyque: 112,
  "dolce & gabbana": 113,
  "elie saab": 115,
  dunhill: 116,
  "ella k": 117,
  "essential parfums": 118,
  "giorgio armani": 120,
  givenchy: 121,
  gucci: 122,
  houbigant: 126,
  "il nome della rosa": 127,
  "issey miyake": 128,
  jeroboam: 130,
  kilian: 134,
  kindus: 135,
  lalique: 136,
  lanvin: 137,
  "le labo": 139,
  "liquides imaginaires": 141,
  loewe: 142,
  "maison crivelli": 143,
  mancera: 144,
  "marco luxury": 145,
  martini: 146,
  "matiere premiere": 147,
  memo: 148,
  monaco: 149,
  montale: 151,
  moschino: 153,
  "mystery de parfum": 154,
  "narciso rodriguez": 155,
  nasomatto: 156,
  "nicholas by elizabeth": 157,
  nicolai: 158,
  "nina ricci": 160,
  "olara parfum": 161,
  "ormonde jayne": 162,
  "orto parisi": 163,
  "paco rabanne": 165,
  paradis: 166,
  penhaligons: 168,
  prada: 169,
  "profumo di firenze": 170,
  replica: 171,
  "roberta de camerino": 172,
  "roberto cavalli": 173,
  rochas: 174,
  "roman jolie": 175,
  "rosendo mateu": 176,
  scentologia: 177,
  shiseido: 178,
  "ssisleyillage d orient signature": 179,
  sospiro: 180,
  "the woods": 182,
  "thierry mugler": 184,
};

// helper to parse color/size arrays from string
function safeParseArray(str) {
  if (!str) return [];
  // If it's already an array, just return it
  if (Array.isArray(str)) return str;

  try {
    // Try parsing as JSON array
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // If JSON.parse fails, handle CSV style (e.g. "21,32,44")
    const trimmed = str.trim();
    let content = trimmed;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      content = trimmed.slice(1, -1);
    }
    if (!content) return [];
    return content
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

// replace "Man"/"Woman" in tags
function replaceManWoman(str) {
  if (!str || typeof str !== "string") return str;
  return str.replace(/\bMan\b/gi, "Male").replace(/\bWoman\b/gi, "Female");
}

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

      // sizes
      // const sizesArr = safeParseArray(row.sizes);
      // const sizes = JSON.stringify(sizesArr);
      let sizesChunks = [];
      if (row.sizes) {
        // Make sure row.sizes is a string
        const sizesStr =
          typeof row.sizes === "string" ? row.sizes : String(row.sizes);

        // Remove commas and spaces
        const cleanSizes = sizesStr.replace(/[, ]+/g, "");

        // Split every 3 characters into an array
        for (let i = 0; i < cleanSizes.length; i += 3) {
          sizesChunks.push(cleanSizes.substr(i, 3));
        }
      }
      const sizes = JSON.stringify(sizesChunks);

      // colors
      const colorsArr = safeParseArray(row.colors);
      const colors = JSON.stringify(colorsArr);

      // tags
      // let tags = "[]";
      // try {
      //   let parsedTags = JSON.parse(row.tags);
      //   if (!Array.isArray(parsedTags)) parsedTags = [parsedTags];
      //   parsedTags = parsedTags.map((tag) => replaceManWoman(tag));
      //   tags = JSON.stringify(parsedTags);
      // } catch {
      //   if (typeof row.tags === "string") {
      //     tags = JSON.stringify([replaceManWoman(row.tags)]);
      //   } else {
      //     tags = "[]";
      //   }
      // }
      // tags (from sheet + gender + subCategory)
      // Updated tags handling for dashed tags from Excel
      // tags (from sheet)
      let tags = [];
      if (row.tags) {
        try {
          let parsedTags = JSON.parse(row.tags);
          if (Array.isArray(parsedTags)) {
            tags = parsedTags;
          } else if (typeof parsedTags === "string") {
            tags = [parsedTags];
          }
        } catch {
          if (typeof row.tags === "string") {
            // Split by newline, comma, or dash
            tags = row.tags
              .split(/\r?\n|,|-/)
              .map((tag) => tag.trim())
              .filter(Boolean);
          }
        }
      }

      // gender handling
      if (row.gender) {
        let genderClean = row.gender.toString().toLowerCase().trim();
        if (genderClean === "man") genderClean = "Male";
        else if (genderClean === "woman") genderClean = "Female";
        else if (genderClean === "unisex") genderClean = "Unisex";
        else genderClean = row.gender; // keep original if different
        tags.push(genderClean);
      }

      // subCategory handling: replace "-" with space
      if (row.subCategory) {
        const cleanSubCategory = row.subCategory.replace(/-/g, " ").trim();
        tags.push(cleanSubCategory);
      }

      // normalize tags: remove duplicates and replace Man/Woman inside tags too
      tags = tags.map((tag) => replaceManWoman(tag)).filter(Boolean);

      tags = Array.from(new Set(tags));

      const tagsJson = JSON.stringify(tags);

      // images
      const images = JSON.stringify(row.images ? [row.images] : []);
      let usageImagesArr = [];
      if (row.usageImages) {
        // If usageImages is a string like "link1, link2"
        usageImagesArr = row.usageImages
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
      const usageImages = JSON.stringify(usageImagesArr);

      // category name to ID
      if (row.category) {
        const cleanCategory = row.category
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        category_id = categoryMap[cleanCategory] || 1;
      }

      // vendor name to ID
      let vendor = 1;
      if (row.vendor) {
        const cleanVendor = row.vendor.trim().toLowerCase();
        vendor = vendorMap[cleanVendor] || 1;
      }

      // brand name to ID
      let brand = null;
      if (row.brand) {
        const cleanBrand = row.brand.trim().toLowerCase();
        brand = brandMap[cleanBrand] || null;
      }

      const offer = Number(row.offer || 0);

      const sql = `
        INSERT INTO products
        (name, model, price, offerPrice, stock, description, warranty, images, usageImages, sizes, colors, category_id, vendor, tags, offer, brand)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        13,
        tagsJson,
        2,
        brand,
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
