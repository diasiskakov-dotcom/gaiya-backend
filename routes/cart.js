const express = require("express");
const { load, save, randomUUID } = require("../data/store");

const router = express.Router();

function findVariant(db, variantSku) {
  for (const product of db.products) {
    const variant = product.variants.find((v) => v.sku === variantSku);
    if (variant) return { product, variant };
  }
  return null;
}

function calculateTotals(cart, db) {
  let subtotal = 0;
  for (const item of cart.items) {
    const found = findVariant(db, item.sku);
    if (!found) continue;
    const price = found.product.prices[cart.region] ?? 0;
    subtotal += price * item.quantity;
  }

  let discountTotal = 0;
  if (cart.discountCode) {
    const discount = db.discounts.find(
      (d) => d.code === cart.discountCode && d.active
    );
    if (discount) {
      discountTotal =
        discount.type === "percentage"
          ? Math.round((subtotal * discount.value) / 100)
          : discount.value;
    }
  }

  const shipping = subtotal > 0 ? 0 : 0; // complimentary shipping, per the brief
  const total = Math.max(subtotal - discountTotal + shipping, 0);

  return { subtotal, discountTotal, shipping, total };
}

// POST /cart — create a new cart
router.post("/", async (req, res) => {
  const db = await load();
  const region = req.body.region || "KZT";
  const cartId = randomUUID();

  db.carts[cartId] = { id: cartId, region, items: [], discountCode: null };
  await save(db);

  res.status(201).json(db.carts[cartId]);
});

// GET /cart/:id
router.get("/:id", async (req, res) => {
  const db = await load();
  const cart = db.carts[req.params.id];
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  res.json({ ...cart, totals: calculateTotals(cart, db) });
});

// POST /cart/:id/items — { sku, quantity }
router.post("/:id/items", async (req, res) => {
  const db = await load();
  const cart = db.carts[req.params.id];
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const { sku, quantity = 1 } = req.body;
  const found = findVariant(db, sku);
  if (!found) return res.status(404).json({ error: "Variant not found" });

  if (found.variant.inventory < quantity) {
    return res.status(409).json({ error: "Insufficient stock" });
  }

  const existing = cart.items.find((i) => i.sku === sku);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ sku, quantity, productId: found.product.id });
  }

  await save(db);
  res.json({ ...cart, totals: calculateTotals(cart, db) });
});

// DELETE /cart/:id/items/:sku
router.delete("/:id/items/:sku", async (req, res) => {
  const db = await load();
  const cart = db.carts[req.params.id];
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  cart.items = cart.items.filter((i) => i.sku !== req.params.sku);
  await save(db);
  res.json({ ...cart, totals: calculateTotals(cart, db) });
});

// POST /cart/:id/discount — { code }
router.post("/:id/discount", async (req, res) => {
  const db = await load();
  const cart = db.carts[req.params.id];
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const discount = db.discounts.find(
    (d) => d.code === req.body.code && d.active
  );
  if (!discount) {
    return res.status(404).json({ error: "Invalid or expired promo code" });
  }
  if (discount.usageLimit && discount.timesUsed >= discount.usageLimit) {
    return res.status(409).json({ error: "Promo code usage limit reached" });
  }

  cart.discountCode = discount.code;
  await save(db);
  res.json({ ...cart, totals: calculateTotals(cart, db) });
});

module.exports = { router, calculateTotals, findVariant };
