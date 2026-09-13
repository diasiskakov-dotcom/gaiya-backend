require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");

const productsRouter = require("./routes/products");
const { router: cartRouter } = require("./routes/cart");
const checkoutRouter = require("./routes/checkout");
const ordersRouter = require("./routes/orders");
const { load, reset } = require("./data/store");

const app = express();
const PORT = process.env.PORT || 9000;

app.use(cors({ origin: (process.env.STORE_CORS || "*").split(",") }));
app.use(express.json());
app.use("/images", express.static(require("path").join(__dirname, "public/images")));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/products", productsRouter);
app.use("/cart", cartRouter);
app.use("/checkout", checkoutRouter);
app.use("/orders", ordersRouter);

app.get("/regions", async (req, res) => {
  const db = await load();
  res.json(db.regions);
});

// Dev-only convenience route to reset the demo database back to seed data.
app.post("/dev/reset", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not available in production" });
  }
  const state = await reset();
  res.json({ status: "reset", productCount: state.products.length });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`GAÏYA backend (demo) listening on http://localhost:${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/products`);
});
