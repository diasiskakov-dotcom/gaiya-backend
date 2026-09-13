// A minimal JSON-file-backed store, used to make this demo backend runnable
// without external infrastructure or a specific Node version. A real SQLite
// implementation exists in db/sqlite.js, and a Postgres one in db/postgres.js
// (same interface as this file) — but node:sqlite requires Node 22+, which
// isn't guaranteed on every hosting platform (Railway currently defaults to
// Node 20), so this plain-JSON version is what's wired in for reliable
// deployment. Swap in db/postgres.js for real production use.

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const seed = require("./seed");

const DB_FILE = path.join(__dirname, "db.json");

function load() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      products: seed.products,
      regions: seed.regions,
      discounts: seed.discounts,
      carts: {},
      orders: {},
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function reset() {
  const initial = {
    products: seed.products,
    regions: seed.regions,
    discounts: seed.discounts,
    carts: {},
    orders: {},
  };
  save(initial);
  return initial;
}

module.exports = { load, save, reset, randomUUID };