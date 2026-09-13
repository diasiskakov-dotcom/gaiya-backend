// Production storage layer — PostgreSQL via the `pg` package. Implements
// the exact same load()/save()/reset() interface as db/sqlite.js, so
// switching from the demo (SQLite) to production (Postgres) is the
// one-line change in data/store.js described there, driven by whether
// DATABASE_URL is set (see the bottom of this file and server.js).
//
// This has NOT been run against a live Postgres instance in this sandbox
// (no outbound network access to a database host here) — the SQLite
// version has been fully tested end-to-end instead, and this file mirrors
// its logic against the `pg` API exactly. Before relying on this in
// production: run `schema.sql` (translated below) against a real Postgres
// database and re-run test/smoke-test.js against this adapter to confirm
// it before going live — don't skip that step just because the code
// mirrors a working implementation.
//
// Postgres-specific schema differences from db/schema.sql (SQLite dialect):
//   - id columns: use UUID DEFAULT gen_random_uuid() instead of TEXT
//   - shipping_address: use JSONB instead of TEXT
//   - datetime('now') -> now()
//   - "order" table name still needs quoting (order is a reserved word)

const { Pool } = require("pg");
const { randomUUID } = require("crypto");
const seed = require("../data/seed");

let pool;

function connect() {
  if (pool) return pool;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function migrate() {
  const conn = connect();
  // In production, run schema migrations via a proper migration tool
  // (node-pg-migrate, Prisma Migrate, or Medusa's own migration runner
  // if this project moves onto Medusa instead). This inline exec is
  // fine for a first deploy, not for ongoing schema changes.
  const fs = require("fs");
  const path = require("path");
  const schema = fs
    .readFileSync(path.join(__dirname, "schema.postgres.sql"), "utf-8");
  await conn.query(schema);
}

async function isSeeded() {
  const conn = connect();
  const { rows } = await conn.query("SELECT COUNT(*) AS count FROM product");
  return Number(rows[0].count) > 0;
}

async function seedDatabase() {
  const conn = connect();
  for (const r of seed.regions) {
    await conn.query("INSERT INTO region (code, name) VALUES ($1, $2)", [
      r.code,
      r.name,
    ]);
  }
  for (const p of seed.products) {
    await conn.query(
      "INSERT INTO product (id, title, description, category, tag) VALUES ($1,$2,$3,$4,$5)",
      [p.id, p.title, p.description, p.category, p.tag]
    );
    for (const [i, img] of p.images.entries()) {
      await conn.query(
        "INSERT INTO product_image (id, product_id, filename, sort_order) VALUES ($1,$2,$3,$4)",
        [randomUUID(), p.id, img, i]
      );
    }
    for (const v of p.variants) {
      await conn.query(
        "INSERT INTO product_variant (sku, product_id, size, color, inventory_quantity) VALUES ($1,$2,$3,$4,$5)",
        [v.sku, p.id, v.size, v.color, v.inventory]
      );
      for (const [regionCode, amount] of Object.entries(p.prices)) {
        await conn.query(
          "INSERT INTO variant_price (sku, region_code, amount) VALUES ($1,$2,$3)",
          [v.sku, regionCode, amount]
        );
      }
    }
  }
  for (const d of seed.discounts) {
    await conn.query(
      "INSERT INTO discount (code, type, value, usage_limit, times_used, active) VALUES ($1,$2,$3,$4,$5,$6)",
      [d.code, d.type, d.value, d.usageLimit, d.timesUsed, d.active]
    );
  }
}

async function ensureReady() {
  await migrate();
  if (!(await isSeeded())) await seedDatabase();
}

async function load() {
  await ensureReady();
  const conn = connect();

  const { rows: productRows } = await conn.query("SELECT * FROM product");
  const products = [];
  for (const p of productRows) {
    const { rows: images } = await conn.query(
      "SELECT filename FROM product_image WHERE product_id = $1 ORDER BY sort_order",
      [p.id]
    );
    const { rows: variantRows } = await conn.query(
      "SELECT * FROM product_variant WHERE product_id = $1",
      [p.id]
    );
    const prices = {};
    if (variantRows.length > 0) {
      const { rows: priceRows } = await conn.query(
        "SELECT region_code, amount FROM variant_price WHERE sku = $1",
        [variantRows[0].sku]
      );
      for (const row of priceRows) prices[row.region_code] = Number(row.amount);
    }
    products.push({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      tag: p.tag,
      images: images.map((i) => i.filename),
      variants: variantRows.map((v) => ({
        sku: v.sku,
        size: v.size,
        color: v.color,
        inventory: v.inventory_quantity,
      })),
      prices,
    });
  }

  const { rows: cartRows } = await conn.query("SELECT * FROM cart");
  const carts = {};
  for (const c of cartRows) {
    const { rows: items } = await conn.query(
      "SELECT sku, quantity FROM cart_item WHERE cart_id = $1",
      [c.id]
    );
    carts[c.id] = {
      id: c.id,
      region: c.region_code,
      discountCode: c.discount_code,
      items,
    };
  }

  const { rows: orderRows } = await conn.query('SELECT * FROM "order"');
  const orders = {};
  for (const o of orderRows) {
    const { rows: items } = await conn.query(
      "SELECT sku, quantity FROM order_item WHERE order_id = $1",
      [o.id]
    );
    orders[o.id] = {
      id: o.id,
      orderNumber: o.order_number,
      customer: {
        email: o.customer_email,
        firstName: o.customer_first_name,
        lastName: o.customer_last_name,
      },
      shippingAddress: o.shipping_address, // JSONB comes back parsed already
      shippingMethod: o.shipping_method,
      paymentMethod: o.payment_method,
      paymentReference: o.payment_reference,
      region: o.region_code,
      items,
      totals: {
        subtotal: Number(o.subtotal),
        discountTotal: Number(o.discount_total),
        shipping: Number(o.shipping_total),
        total: Number(o.total),
      },
      status: o.status,
      createdAt: o.created_at,
    };
  }

  const { rows: discountRows } = await conn.query("SELECT * FROM discount");
  const discounts = discountRows.map((d) => ({
    code: d.code,
    type: d.type,
    value: Number(d.value),
    usageLimit: d.usage_limit,
    timesUsed: d.times_used,
    active: d.active,
  }));

  return { products, regions: seed.regions, discounts, carts, orders };
}

async function save(state) {
  const conn = connect();
  const client = await conn.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM cart_item");
    await client.query("DELETE FROM cart");
    for (const cart of Object.values(state.carts)) {
      await client.query(
        "INSERT INTO cart (id, region_code, discount_code) VALUES ($1,$2,$3)",
        [cart.id, cart.region, cart.discountCode]
      );
      for (const item of cart.items) {
        await client.query(
          "INSERT INTO cart_item (cart_id, sku, quantity) VALUES ($1,$2,$3)",
          [cart.id, item.sku, item.quantity]
        );
      }
    }

    const { rows: existing } = await client.query('SELECT id FROM "order"');
    const existingIds = new Set(existing.map((r) => r.id));

    for (const order of Object.values(state.orders)) {
      if (!existingIds.has(order.id)) {
        await client.query(
          `INSERT INTO "order" (
            id, order_number, customer_email, customer_first_name, customer_last_name,
            shipping_address, shipping_method, payment_method, payment_reference,
            region_code, subtotal, discount_total, shipping_total, total, status, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            order.id,
            order.orderNumber,
            order.customer.email,
            order.customer.firstName,
            order.customer.lastName,
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
            order.createdAt,
          ]
        );
        for (const item of order.items) {
          const { rows: priceRows } = await client.query(
            "SELECT amount FROM variant_price WHERE sku = $1 AND region_code = $2",
            [item.sku, order.region]
          );
          await client.query(
            "INSERT INTO order_item (order_id, sku, quantity, unit_price) VALUES ($1,$2,$3,$4)",
            [order.id, item.sku, item.quantity, priceRows[0]?.amount ?? 0]
          );
        }
      } else {
        await client.query('UPDATE "order" SET status = $1 WHERE id = $2', [
          order.status,
          order.id,
        ]);
      }
    }

    for (const d of state.discounts) {
      await client.query(
        "UPDATE discount SET times_used = $1 WHERE code = $2",
        [d.timesUsed, d.code]
      );
    }

    for (const product of state.products) {
      for (const v of product.variants) {
        await client.query(
          "UPDATE product_variant SET inventory_quantity = $1 WHERE sku = $2",
          [v.inventory, v.sku]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function reset() {
  const conn = connect();
  await conn.query("TRUNCATE order_item, \"order\", cart_item, cart, variant_price, product_variant, product_image, product, discount, region CASCADE");
  await seedDatabase();
  return load();
}

module.exports = { load, save, reset, randomUUID };
