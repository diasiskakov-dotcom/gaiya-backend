const express = require("express");
const { load, save } = require("../data/store");
const { requireAdmin } = require("../middleware/adminAuth");

const router = express.Router();

const VALID_STATUSES = [
  "new",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

// GET /orders — admin only, list all orders
router.get("/", requireAdmin, async (req, res) => {
  const db = await load();
  const orders = Object.values(db.orders).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ count: orders.length, orders });
});

// GET /orders/:id — admin only, single order with full detail
router.get("/:id", requireAdmin, async (req, res) => {
  const db = await load();
  const order = db.orders[req.params.id];
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

// GET /orders/:id/confirmation — public, deliberately limited fields.
// The order ID itself (a UUID) functions as the access token here, the
// same pattern most storefronts use for a post-checkout confirmation page.
// It intentionally omits nothing sensitive beyond what the customer who
// just placed the order already knows.
router.get("/:id/confirmation", async (req, res) => {
  const db = await load();
  const order = db.orders[req.params.id];
  if (!order) return res.status(404).json({ error: "Order not found" });

  const enrichedItems = order.items.map((item) => {
    for (const product of db.products) {
      const variant = product.variants.find((v) => v.sku === item.sku);
      if (variant) {
        return {
          sku: item.sku,
          quantity: item.quantity,
          title: product.title,
          color: variant.color,
          size: variant.size,
          price: product.prices[order.region] ?? 0,
          imageUrl: product.images[0]
            ? `${req.protocol}://${req.get("host")}/images/${product.images[0]}`
            : null,
        };
      }
    }
    return { sku: item.sku, quantity: item.quantity };
  });

  res.json({
    orderNumber: order.orderNumber,
    items: enrichedItems,
    region: order.region,
    totals: order.totals,
    shippingAddress: order.shippingAddress,
    shippingMethod: order.shippingMethod,
    status: order.status,
    createdAt: order.createdAt,
  });
});

// PATCH /orders/:id/status — { status }
router.patch("/:id/status", requireAdmin, async (req, res) => {
  const db = await load();
  const order = db.orders[req.params.id];
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  order.status = status;
  await save(db);
  res.json(order);
});

module.exports = router;
