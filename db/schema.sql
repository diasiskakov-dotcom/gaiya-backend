-- Real schema, run against SQLite via Node's built-in driver in dev/demo,
-- and directly portable to PostgreSQL for production (see db/postgres.js
-- for the notes on the handful of syntax differences: UUID type, JSONB
-- instead of TEXT for json columns, and gen_random_uuid() instead of
-- application-generated UUIDs).

CREATE TABLE IF NOT EXISTS region (
    code TEXT PRIMARY KEY,      -- KZT, USD, EUR
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tag TEXT,
    status TEXT DEFAULT 'published',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_image (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variant (
    sku TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    size TEXT,
    color TEXT,
    inventory_quantity INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS variant_price (
    sku TEXT NOT NULL REFERENCES product_variant(sku) ON DELETE CASCADE,
    region_code TEXT NOT NULL REFERENCES region(code),
    amount NUMERIC NOT NULL,
    PRIMARY KEY (sku, region_code)
);

CREATE TABLE IF NOT EXISTS discount (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL,             -- percentage | fixed
    value NUMERIC NOT NULL,
    usage_limit INTEGER,
    times_used INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cart (
    id TEXT PRIMARY KEY,
    region_code TEXT NOT NULL REFERENCES region(code),
    discount_code TEXT REFERENCES discount(code),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_item (
    cart_id TEXT NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
    sku TEXT NOT NULL REFERENCES product_variant(sku),
    quantity INTEGER NOT NULL,
    PRIMARY KEY (cart_id, sku)
);

CREATE TABLE IF NOT EXISTS "order" (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_email TEXT NOT NULL,
    customer_first_name TEXT,
    customer_last_name TEXT,
    shipping_address TEXT,          -- JSON blob (JSONB on Postgres)
    shipping_method TEXT,
    payment_method TEXT,
    payment_reference TEXT,
    region_code TEXT NOT NULL,
    subtotal NUMERIC,
    discount_total NUMERIC DEFAULT 0,
    shipping_total NUMERIC DEFAULT 0,
    total NUMERIC,
    status TEXT DEFAULT 'new',      -- new|paid|processing|shipped|completed|cancelled
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_item (
    order_id TEXT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    PRIMARY KEY (order_id, sku)
);
