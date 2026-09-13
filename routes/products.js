const express = require("express");
const { load } = require("../data/store");

const router = express.Router();

// GET /products — supports ?category=, ?size=, ?color=, ?region=
router.get("/", async (req, res) => {
  const db = await load();
  const { category, size, color, region = "KZT" } = req.query;

  let results = db.products;

  if (category) {
    results = results.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }
  if (size) {
    results = results.filter((p) =>
      p.variants.some((v) => v.size.toLowerCase() === size.toLowerCase())
    );
  }
  if (color) {
    results = results.filter((p) =>
      p.variants.some((v) =>
        v.color.toLowerCase().includes(color.toLowerCase())
      )
    );
  }

  const withRegionPrice = results.map((p) => ({
    ...p,
    price: p.prices[region] ?? null,
    currency: region,
    imageUrls: p.images.map((img) => `${req.protocol}://${req.get("host")}/images/${img}`),
  }));

  res.json({ count: withRegionPrice.length, products: withRegionPrice });
});

// GET /products/:id
router.get("/:id", async (req, res) => {
  const db = await load();
  const region = req.query.region || "KZT";
  const product = db.products.find((p) => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json({
    ...product,
    price: product.prices[region] ?? null,
    currency: region,
    imageUrls: product.images.map((img) => `${req.protocol}://${req.get("host")}/images/${img}`),
  });
});

module.exports = router;
