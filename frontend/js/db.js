/* ==========================================================================
   db.js — IndexedDB layer for the POS app (replaces SQLite)

   This module is the ONLY code that touches IndexedDB directly. The Backend
   module (backend.js) calls these helpers the same way the old Python
   repositories called the DB.

   Object stores (1:1 with the old SQL tables):
     - users              (keyPath: id, autoIncrement)
     - categories         (keyPath: id)
     - products           (keyPath: id)
     - transactions       (keyPath: id)
     - settings           (keyPath: key)   -- key/value store
     - meta               (keyPath: key)   -- internal: counters, flags

   Auto-increment IDs are managed manually via a `meta` counter so the
   numeric ids stay contiguous and match the old SQLite behaviour.
   ========================================================================== */
(function (global) {
  "use strict";

  const DB_NAME = "pos-db";
  const DB_VERSION = 1;
  const STORES = ["users", "categories", "products", "transactions"];
  const LOW_STOCK_THRESHOLD = 5;

  let _db = null;
  let _initPromise = null;

  /* ---------- default settings (mirrors models/settings.py DEFAULTS) ---------- */
  const DEFAULT_SETTINGS = {
    store_name: "SURANTAKA COFFEE",
    store_address:
      "Kp. Surantaka, RT.02/RW.01, Desa Kalijati Timur, Kecamatan Kalijati, Kabupaten Subang, 41271",
    store_phone: "0812-3456-7890",
    footer_note:
      "Mau pesan lagi tanpa antre atau tertarik punya bisnis kopi sendiri? Pindai saya!",
    thank_you: "Thank you for your order!",
    qr_mode: "wa",
    wa_number: "6281234567890",
    wa_message: "",
    custom_url: "",
    qr_url: "https://wa.me/6281234567890",
    invoice_prefix: "SC",
    currency: "Rp",
    app_name: "SURANTAKA",
    app_title: "SURANTAKA POS — Kasir",
    app_logo: "",
    app_icon: "",
    paper_width: "58",
    paper_chars: "32",
    printer_name: "",
  };

  /* ==========================================================================
     Connection
     ========================================================================== */
  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("users"))
          db.createObjectStore("users", { keyPath: "id" });
        if (!db.objectStoreNames.contains("categories"))
          db.createObjectStore("categories", { keyPath: "id" });
        if (!db.objectStoreNames.contains("products"))
          db.createObjectStore("products", { keyPath: "id" });
        if (!db.objectStoreNames.contains("transactions"))
          db.createObjectStore("transactions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("settings"))
          db.createObjectStore("settings", { keyPath: "key" });
        if (!db.objectStoreNames.contains("meta"))
          db.createObjectStore("meta", { keyPath: "key" });
      };

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      _db = await open();
      await seedIfEmpty();
      return _db;
    })();
    return _initPromise;
  }

  function db() {
    if (!_db) throw new Error("Database belum diinisialisasi. Panggil Db.init().");
    return _db;
  }

  /* ==========================================================================
     Generic CRUD helpers (promisified)
     ========================================================================== */

  /* Read all records from a store, optionally sorted by a key. */
  function getAll(store, sortBy) {
    return new Promise((resolve, reject) => {
      const req = db().transaction(store).objectStore(store).getAll();
      req.onsuccess = () => {
        let rows = req.result || [];
        if (sortBy) rows = rows.slice().sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : a[sortBy] < b[sortBy] ? -1 : 0));
        resolve(rows);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /* Read a single record by its primary key. */
  function get(store, key) {
    return new Promise((resolve, reject) => {
      const req = db().transaction(store).objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /* Put (insert or update) a record. Returns the record. */
  function put(store, record) {
    return new Promise((resolve, reject) => {
      const tx = db().transaction(store, "readwrite");
      tx.objectStore(store).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /* Delete a record by primary key. */
  function remove(store, key) {
    return new Promise((resolve, reject) => {
      const tx = db().transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /* Clear an entire store. */
  function clear(store) {
    return new Promise((resolve, reject) => {
      const tx = db().transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /* ==========================================================================
     Auto-increment ID helpers
     ========================================================================== */
  async function nextId(store) {
    const rows = await getAll(store);
    if (!rows.length) return 1;
    return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  }

  /* ==========================================================================
     Settings (key/value)
     ========================================================================== */
  async function getAllSettings() {
    const rows = await getAll("settings");
    const out = {};
    rows.forEach((r) => (out[r.key] = r.value));
    return { ...DEFAULT_SETTINGS, ...out };
  }

  async function getSetting(key, def) {
    const row = await get("settings", key);
    return row ? row.value : def;
  }

  async function setSetting(key, value) {
    await put("settings", { key, value });
    return value;
  }

  async function setManySettings(items) {
    const tx = db().transaction("settings", "readwrite");
    const store = tx.objectStore("settings");
    Object.entries(items).forEach(([k, v]) => {
      store.put({ key: k, value: v === null || v === undefined ? "" : v });
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /* ==========================================================================
     Meta helpers (internal flags / counters)
     ========================================================================== */
  async function getMeta(key, def) {
    const row = await get("meta", key);
    return row ? row.value : def;
  }
  async function setMeta(key, value) {
    await put("meta", { key, value });
    return value;
  }

  /* ==========================================================================
     Seeding — runs ONCE on a brand-new database
     ========================================================================== */
  async function seedIfEmpty() {
    const seeded = await getMeta("seeded", false);
    if (seeded) return;

    const now = _nowStr();

    /* Users */
    await put("users", {
      id: 1,
      username: "admin",
      password: "admin",
      role: "admin",
      full_name: "Administrator",
      created_at: now,
    });
    await put("users", {
      id: 2,
      username: "kasir",
      password: "kasir",
      role: "kasir",
      full_name: "Kasir Toko",
      created_at: now,
    });

    /* Settings */
    await setManySettings(DEFAULT_SETTINGS);

    /* Categories */
    await put("categories", { id: 1, name: "Makanan", description: "Kategori untuk semua produk makanan", created_at: now });
    await put("categories", { id: 2, name: "Minuman", description: "Kategori untuk semua produk minuman", created_at: now });

    /* Sample products (mirrors config/db.py seed data) */
    const samples = [
      [2, "Caffe Latte", "8991002101010", "Espresso dengan susu segar", 5000, 10000, 14000, 15000, 100],
      [2, "Cappuccino", "8991002101027", "Espresso, susu, dan foam", 5000, 12000, 16000, 17000, 100],
      [2, "Americano", "8991002101034", "Espresso dengan air panas", 4000, 9000, 13000, 14000, 100],
      [2, "Espresso", "8991002101041", "Single shot espresso murni", 3500, 8000, 11000, 12000, 100],
      [2, "Matcha Latte", "8991002101058", "Teh hijau dengan susu", 5000, 13000, 17000, 18000, 80],
      [2, "Chocolate", "8991002101065", "Coklat hangat", 4500, 12000, 16000, 17000, 80],
      [2, "Lemon Tea", "8991002101072", "Teh lemon segar", 3000, 8000, 11000, 12000, 60],
      [1, "Roti Bakar", "8991002101089", "Roti bakar dengan topping", 3000, 10000, null, null, 50],
      [1, "Pisang Goreng", "8991002101096", "Pisang goreng crispy", 2500, 8000, null, null, 50],
      [1, "Kentang Goreng", "8991002101102", "French fries", 4000, 12000, null, null, 50],
    ];
    let pid = 1;
    for (const [catId, name, barcode, desc, beli, normal, medium, maxi, stock] of samples) {
      await put("products", {
        id: pid++,
        category_id: catId,
        name,
        barcode,
        description: desc,
        harga_beli: beli,
        harga_normal: normal,
        harga_medium: medium,
        harga_max: maxi,
        stock,
        stock_normal: normal != null ? stock : 0,
        stock_medium: medium != null ? stock : 0,
        stock_max: maxi != null ? stock : 0,
        image_path: "",
        is_active: 1,
        created_at: now,
      });
    }

    await setMeta("seeded", true);
  }

  /* current timestamp string like Python's datetime('now','localtime') */
  function _nowStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /* ---------- public surface ---------- */
  const Db = {
    DB_NAME,
    DB_VERSION,
    LOW_STOCK_THRESHOLD,
    DEFAULT_SETTINGS,
    init,
    getAll,
    get,
    put,
    remove,
    clear,
    nextId,
    getAllSettings,
    getSetting,
    setSetting,
    setManySettings,
    getMeta,
    setMeta,
    nowStr: _nowStr,
  };

  global.Db = Db;
})(window);
