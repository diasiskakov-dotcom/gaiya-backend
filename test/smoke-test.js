// Minimal smoke test for the demo backend — no test framework dependency,
// just plain assertions against a running server. Run with:
//   node server.js &  (in one terminal)
//   node test/smoke-test.js  (in another)

const BASE = process.env.API_URL || "http://localhost:9000";

async function main() {
  const log = (label, ok) => console.log(`${ok ? "✓" : "✗"} ${label}`);

  // Health check
  let res = await fetch(`${BASE}/health`);
  log("health check", res.ok);

  // List products
  res = await fetch(`${BASE}/products`);
  let data = await res.json();
  log("products list returns 10 items", data.count === 10);

  // Create cart
  res = await fetch(`${BASE}/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region: "KZT" }),
  });
  const cart = await res.json();
  log("cart created", !!cart.id);

  // Add item
  res = await fetch(`${BASE}/cart/${cart.id}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "TWT-BRN-S", quantity: 1 }),
  });
  data = await res.json();
  log("item added, subtotal correct", data.totals.subtotal === 268000);

  // Apply invalid promo
  res = await fetch(`${BASE}/cart/${cart.id}/discount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "NOTREAL" }),
  });
  log("invalid promo code rejected", res.status === 404);

  // Checkout with no customer email — should fail
  res = await fetch(`${BASE}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId: cart.id, customer: {} }),
  });
  log("checkout without email rejected", res.status === 400);

  // Real checkout
  res = await fetch(`${BASE}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cartId: cart.id,
      customer: { email: "test@example.com" },
      shippingAddress: { country: "Kazakhstan", city: "Almaty" },
    }),
  });
  data = await res.json();
  log("checkout succeeds", res.status === 201 && data.order.status === "paid");

  // Cart should no longer exist
  res = await fetch(`${BASE}/cart/${cart.id}`);
  log("cart cleared after checkout", res.status === 404);

  // Email rendering (real logic, no external provider needed)
  const { renderConfirmationEmail } = require("../notifications/email");
  const html = renderConfirmationEmail(data.order, () => ({
    title: "The Twill Trench",
    color: "Brown",
    size: "S",
    price: 268000,
    imageUrl: "http://localhost:9000/images/sample-01-trench-dev.jpeg",
  }));
  log(
    "confirmation email renders with order number and no leftover placeholders",
    html.includes(data.order.orderNumber) && !html.includes("{{")
  );

  console.log("\nSmoke test complete.");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
