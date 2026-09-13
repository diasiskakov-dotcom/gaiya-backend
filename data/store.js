// Storage layer entry point. Currently points at the real SQLite-backed
// implementation in db/sqlite.js. A Postgres implementation with the
// identical interface lives in db/postgres.js — swap the require below
// (or branch on process.env.DATABASE_URL) when moving to production.
//
// The old JSON-file version is kept at data/store.json-legacy.js.bak for
// reference only; it's no longer used.

module.exports = require("../db/sqlite");
