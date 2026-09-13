const express = require("express");
const { load, save, randomUUID } = require("../data/store");
const { calculateTotals, findVariant } = require("./cart");
const { createPayment } = require("../payments/stripe");
const { createKaspiPayment } = require("../payments/kaspi");
const { sendOrderConfirmation } = require("../notifications/email");

const router = express.Router();

// POST /checkout — { cartId, customer, shippingAddress, shippingMethod, paymentMethod }
router.post("/", async (req, res) => {
  const db = await load();
  const {
    cartId,
    customer,
    shippingAddress,
    shippingMethod = "standard",
    paymentMethod = "card",
  } = req.body;

  const cart = db.carts[cartId];
  if (!cart) return res.status(404).json({ error: "Cart not found" });
  if (cart.items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }
  if (!customer?.email) {
    return res.status(400).json({ error: "Customer email is required" });
  }

  // Confirm stock is still available for every line item before charging.
  for (const item of cart.items) {
    const found = findVariant(db, item.sku);
    if (!found || found.variant.inventory < item.quantity) {
      return res
        .status(409)
        .json({ error: `Insufficient stock for ${item.sku}` });
    }
  }

  const totals = calculateTotals(cart, db);

  // Route to the right payment provider. Both are stubs here — see
  // payments/stripe.js and payments/kaspi.js for what a real integration
  // needs to do.
  let paymentResult;
  try {
    paymentResult =
      paymentMethod === "kaspi"
        ? await createKaspiPayment(totals.total, cart.region)
        : await createPayment(totals.total, cart.region);
  } catch (err) {
    return res.status(502).json({ error: "Payment provider error", detail: err.message });
  }

  if (!paymentResult.success) {
    return res.status(402).json({ error: "Payment declined" });
  }

  // Decrement inventory now that payment has succeeded.
  for (const item of cart.items) {
    const found = findVariant(db, item.sku);
    found.variant.inventory -= item.quantity;
  }

  // Record discount usage.
  if (cart.discountCode) {
    const discount = db.discounts.find((d) => d.code === cart.discountCode);
    if (discount) discount.timesUsed += 1;
  }

  const orderId = randomUUID();
  const orderNumber = `GA-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = {
    id: orderId,
    orderNumber,
    customer,
    shippingAddress,
    shippingMethod,
    paymentMethod,
    items: cart.items,
    region: cart.region,
    totals,
    status: "paid", // New | Paid | Processing | Shipped | Completed | Cancelled
    paymentReference: paymentResult.reference,
    createdAt: new Date().toISOString(),
  };

  db.orders[orderId] = order;
  delete db.carts[cartId];
  await save(db);

  // Fire-and-forget confirmation email — errors here shouldn't fail the order.
  const productLookup = (sku) => {
    const found = findVariant(db, sku);
    if (!found) return null;
    return {
      title: found.product.title,
      color: found.variant.color,
      size: found.variant.size,
      price: found.product.prices[order.region] ?? 0,
      imageUrl: found.product.images[0]
        ? `${req.protocol}://${req.get("host")}/images/${found.product.images[0]}`
        : "",
    };
  };
  sendOrderConfirmation(order, productLookup).catch((err) =>
    console.error("Failed to send confirmation email:", err.message)
  );

  res.status(201).json({ order });
});

module.exports = router;
