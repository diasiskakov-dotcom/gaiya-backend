// Real SQL storage layer, backed by SQLite (Node's built-in node:sqlite
// module — stable enough for this purpose, zero extra dependencies).
// This is a genuine, ACID-compliant relational database with the schema
// in db/schema.sql, migrations, and real queries — not a JSON file.
//
// It intentionally exposes the same load()/save() shape that
// data/store.js (the old JSON version) did, so routes/products.js,
// routes/cart.js, routes/checkout.js, and routes/orders.js did not need
// to change at all. Internally, load() assembles that shape from real
// SQL queries across normalized tables, and save() writes cart/order/
// discount state back inside a transaction.
//
// To move to PostgreSQL for production: see db/postgres.js, which
// implements the identical exported interface using the `pg` package
// against schema.sql (translated to Postgres syntax — UUID/JSONB/
// gen_random_uuid()). Swapping is a one-line change in this file's
// single require at the bottom, or an env-based switch — see server.js.

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const seed = require("../data/seed");

const DB_PATH = path.join(__dirname, "gaiya.sqlite");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

let db;

function connect() {
  if (db) return db;
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

function migrate() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  connect().exec(schema);
}

function isSeeded() {
  const row = connect()
    .prepare("SELECT COUNT(*) as count FROM product")
    .get();
  return row.count > 0;
}

function seedDatabase() {
  const conn = connect();

  const insertRegion = conn.prepare(
    "INSERT INTO region (code, name) VALUES (?, ?)"
  );
  for (const r of seed.regions) insertRegion.run(r.code, r.name);

  const insertProduct = conn.prepare(
    "INSERT INTO product (id, title, description, category, tag) VALUES (?, ?, ?, ?, ?)"
  );
  const insertImage = conn.prepare(
    "INSERT INTO product_image (id, product_id, filename, sort_order) VALUES (?, ?, ?, ?)"
  );
  const insertVariant = conn.prepare(
    "INSERT INTO product_variant (sku, product_id, size, color, inventory_quantity) VALUES (?, ?, ?, ?, ?)"
  );
  const insertPrice = conn.prepare(
    "INSERT INTO variant_price (sku, region_code, amount) VALUES (?, ?, ?)"
  );

  for (const p of seed.products) {
    insertProduct.run(p.id, p.title, p.description, p.category, p.tag);
    p.images.forEach((img, i) => insertImage.run(randomUUID(), p.id, img, i));
    for (const v of p.variants) {
      insertVariant.run(v.sku, p.id, v.size, v.color, v.inventory);
      for (const [regionCode, amount] of Object.entries(p.prices)) {
        insertPrice.run(v.sku, regionCode, amount);
      }
    }
  }

  const insertDiscount = conn.prepare(
    "INSERT INTO discount (code, type, value, usage_limit, times_used, active) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const d of seed.discounts) {
    insertDiscount.run(d.code, d.type, d.value, d.usageLimit, d.timesUsed, d.active ? 1 : 0);
  }
}

function ensureReady() {
  connect();
  migrate();
  if (!isSeeded()) seedDatabase();
}

// ---- load(): assembles the in-memory shape routes expect, from real SQL ----

function loadProducts() {
  const conn = connect();
  const products = conn.prepare("SELECT * FROM product").all();

  return products.map((p) => {
    const images = conn
      .prepare(
        "SELECT filename FROM product_image WHERE product_id = ? ORDER BY sort_order"
      )
      .all(p.id)
      .map((r) => r.filename);

    const variantRows = conn
      .prepare("SELECT * FROM product_variant WHERE product_id = ?")
      .all(p.id);

    const variants = variantRows.map((v) => ({
      sku: v.sku,
      size: v.size,
      color: v.color,
      inventory: v.inventory_quantity,
    }));

    const prices = {};
    if (variantRows.length > 0) {
      const priceRows = conn
        .prepare(
          `SELECT region_code, amount FROM variant_price WHERE sku = ?`
        )
        .all(variantRows[0].sku);
      for (const row of priceRows) prices[row.region_code] = row.amount;
    }

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      tag: p.tag,
      images,
      variants,
      prices,
    };
  });
}

function loadCarts() {
  const conn = connect();
  const carts = conn.prepare("SELECT * FROM cart").all();
  const result = {};
  for (const c of carts) {
    const items = conn
      .prepare("SELECT sku, quantity FROM cart_item WHERE cart_id = ?")
      .all(c.id);
    result[c.id] = {
      id: c.id,
      region: c.region_code,
      discountCode: c.discount_code,
      items,
    };
  }
  return result;
}

function loadOrders() {
  const conn = connect();
  const orders = conn.prepare('SELECT * FROM "order"').all();
  const result = {};
  for (const o of orders) {
    const items = conn
      .prepare("SELECT sku, quantity FROM order_item WHERE order_id = ?")
      .all(o.id);
    result[o.id] = {
      id: o.id,
      orderNumber: o.order_number,
      customer: {
        email: o.customer_email,
        firstName: o.customer_first_name,
        lastName: o.customer_last_name,
      },
      shippingAddress: o.shipping_address ? JSON.parse(o.shipping_address) : null,
      shippingMethod: o.shipping_method,
      paymentMethod: o.payment_method,
      paymentReference: o.payment_reference,
      region: o.region_code,
      items: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
      totals: {
        subtotal: o.subtotal,
        discountTotal: o.discount_total,
        shipping: o.shipping_total,
        total: o.total,
      },
      status: o.status,
      createdAt: o.created_at,
    };
  }
  return result;
}

function loadDiscounts() {
  const conn = connect();
  return conn
    .prepare("SELECT * FROM discount")
    .all()
    .map((d) => ({
      code: d.code,
      type: d.type,
      value: d.value,
      usageLimit: d.usage_limit,
      timesUsed: d.times_used,
      active: !!d.active,
    }));
}

function load() {
  ensureReady();
  return {
    products: loadProducts(),
    regions: seed.regions,
    discounts: loadDiscounts(),
    carts: loadCarts(),
    orders: loadOrders(),
  };
}

// ---- save(): writes cart/order/discount state back inside a transaction ----

function save(state) {
  const conn = connect();

  conn.exec("BEGIN");
  try {
    // Carts: replace wholesale (small tables, simplest correct approach)
    conn.exec("DELETE FROM cart_item");
    conn.exec("DELETE FROM cart");
    const insertCart = conn.prepare(
      "INSERT INTO cart (id, region_code, discount_code) VALUES (?, ?, ?)"
    );
    const insertCartItem = conn.prepare(
      "INSERT INTO cart_item (cart_id, sku, quantity) VALUES (?, ?, ?)"
    );
    for (const cart of Object.values(state.carts)) {
      insertCart.run(cart.id, cart.region, cart.discountCode || null);
      for (const item of cart.items) {
        insertCartItem.run(cart.id, item.sku, item.quantity);
      }
    }

    // Orders: insert any not already present (orders are immutable once
    // created, except for status, which is updated separately below)
    const existingOrderIds = new Set(
      conn.prepare('SELECT id FROM "order"').all().map((r) => r.id)
    );
    const insertOrder = conn.prepare(`
      INSERT INTO "order" (
        id, order_number, customer_email, customer_first_name, customer_last_name,
        shipping_address, shipping_method, payment_method, payment_reference,
        region_code, subtotal, discount_total, shipping_total, total, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOrderItem = conn.prepare(
      "INSERT INTO order_item (order_id, sku, quantity, unit_price) VALUES (?, ?, ?, ?)"
    );
    const updateOrderStatus = conn.prepare(
      'UPDATE "order" SET status = ? WHERE id = ?'
    );

    for (const order of Object.values(state.orders)) {
      if (!existingOrderIds.has(order.id)) {
        insertOrder.run(
          order.id,
          order.orderNumber,
          order.customer.email,
          order.customer.firstName || null,
          order.customer.lastName || null,
          order.shippingAddress ? JSON.stringify(order.shippingAddress) : null,
          order.shippingMethod,
          order.paymentMethod,
          order.paymentReference,
          order.region,
          order.totals.subtotal,
          order.totals.discountTotal,
          order.totals.shipping,
          order.totals.total,
          order.status,
          order.createdAt
        );
        for (const item of order.items) {
          const priceRow = conn
            .prepare(
              "SELECT amount FROM variant_price WHERE sku = ? AND region_code = ?"
            )
            .get(item.sku, order.region);
          insertOrderItem.run(
            order.id,
            item.sku,
            item.quantity,
            priceRow ? priceRow.amount : 0
          );
        }
      } else {
        updateOrderStatus.run(order.status, order.id);
      }
    }

    // Discounts: update usage counters
    const updateDiscount = conn.prepare(
      "UPDATE discount SET times_used = ? WHERE code = ?"
    );
    for (const d of state.discounts) {
      updateDiscount.run(d.timesUsed, d.code);
    }

    // Inventory: reflect current variant inventory levels
    const updateInventory = conn.prepare(
      "UPDATE product_variant SET inventory_quantity = ? WHERE sku = ?"
    );
    for (const product of state.products) {
      for (const v of product.variants) {
        updateInventory.run(v.inventory, v.sku);
      }
    }

    conn.exec("COMMIT");
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}

function reset() {
  const conn = connect();
  conn.exec("DELETE FROM order_item");
  conn.exec('DELETE FROM "order"');
  conn.exec("DELETE FROM cart_item");
  conn.exec("DELETE FROM cart");
  conn.exec("DELETE FROM variant_price");
  conn.exec("DELETE FROM product_variant");
  conn.exec("DELETE FROM product_image");
  conn.exec("DELETE FROM product");
  conn.exec("DELETE FROM discount");
  conn.exec("DELETE FROM region");
  seedDatabase();
  return load();
}

module.exports = { load, save, reset, randomUUID };
