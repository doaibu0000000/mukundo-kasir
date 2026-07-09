/* ==========================================================================
   backend.js — client-side business logic (replaces Python services)

   This module ports every service/repository method from the Python backend
   into JavaScript that runs entirely in the browser against IndexedDB.

   The API module (api.js) calls these functions the same way the old Flask
   routes called the Python services. Signatures match 1:1 so the view
   layer never needs to change.

   Auth/session lives in localStorage (`pos.user`). The browser only stores
   the public user object for UI visibility — RBAC is enforced here on
   every privileged call.
   ========================================================================== */
(function (global) {
  "use strict";

  const SESSION_KEY = "pos.user";
  const PLATFORMS = ["Pickup", "Take Away", "GrabFood", "ShopeeFood", "GoFood"];

  /* ==========================================================================
     Helpers
     ========================================================================== */
  const SESSION_USER_KEY = "pos.user";

  function _sessionUser() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_USER_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function _setSessionUser(u) {
    if (u) localStorage.setItem(SESSION_USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_USER_KEY);
  }

  function isLoggedIn() {
    return !!_sessionUser();
  }

  function isAdmin() {
    const u = _sessionUser();
    return u && u.role === "admin";
  }

  function requireLogin() {
    if (!isLoggedIn()) throw new Error("Unauthorized Access: silakan login terlebih dahulu");
  }

  function requireAdmin() {
    requireLogin();
    if (!isAdmin()) throw new Error("Unauthorized Access");
  }

  function _nullableNum(v) {
    // mirror of Python _nullable_float: empty string -> null
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  function _toNum(v, def = 0) {
    const n = Number(v);
    return isNaN(n) ? def : n;
  }

  /* Attach category_name to a product row (mirrors the SQL LEFT JOIN). */
  async function _withCategoryName(p) {
    if (!p) return p;
    if (p.category_id) {
      const cat = await Db.get("categories", p.category_id);
      p.category_name = cat ? cat.name : null;
    } else {
      p.category_name = null;
    }
    return p;
  }

  /* Normalise an image_path / base64 into a browser-usable URL. */
  function _imageUrl(imagePath) {
    if (!imagePath) return "";
    if (imagePath.startsWith("data:") || imagePath.startsWith("http") || imagePath.startsWith("/")) {
      return imagePath;
    }
    return imagePath;
  }

  function _withImageUrl(row) {
    if (!row) return row;
    row.image_url = _imageUrl(row.image_path || "");
    return row;
  }

  /* ==========================================================================
     AUTH
     ========================================================================== */
  const Auth = {
    async login(username, password) {
      const users = await Db.getAll("users");
      const user = users.find(
        (u) => u.username === username && u.password === password
      );
      if (!user) return null;
      const pub = {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      };
      _setSessionUser(pub);
      return pub;
    },

    logout() {
      _setSessionUser(null);
    },

    currentUser() {
      const u = _sessionUser();
      return u ? { ...u } : null;
    },
  };

  /* ==========================================================================
     PRODUCTS
     ========================================================================== */
  function _validateProduct(data) {
    if (!(data.name || "").trim()) throw new Error("Nama produk wajib diisi");
    if (isNaN(_toNum(data.harga_beli, NaN))) throw new Error("Harga beli tidak valid");
    const prices = [data.harga_normal, data.harga_medium, data.harga_max];
    if (prices.every((p) => p === null || p === "" || p === 0))
      throw new Error("Minimal satu varian harga (Normal/Medium/Max) wajib diisi");
  }

  const Products = {
    async list(activeOnly = true) {
      let rows = await Db.getAll("products");
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      if (activeOnly) rows = rows.filter((p) => p.is_active);
      for (const p of rows) {
        await _withCategoryName(p);
        _withImageUrl(p);
      }
      return rows;
    },

    async search(keyword = "", categoryId = 0) {
      let rows = await Db.getAll("products");
      rows = rows.filter((p) => p.is_active);
      const kw = (keyword || "").toLowerCase().trim();
      if (kw) {
        rows = rows.filter(
          (p) =>
            (p.name || "").toLowerCase().includes(kw) ||
            (p.barcode || "").toLowerCase().includes(kw)
        );
      }
      if (categoryId) rows = rows.filter((p) => p.category_id === categoryId);
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      for (const p of rows) {
        await _withCategoryName(p);
        _withImageUrl(p);
      }
      return rows;
    },

    async get(id) {
      const p = await Db.get("products", id);
      if (!p) return null;
      await _withCategoryName(p);
      return _withImageUrl(p);
    },

    async create(data) {
      _validateProduct(data);
      const id = await Db.nextId("products");
      const now = Db.nowStr();
      const stock = _toNum(data.stock, 0);
      const record = {
        id,
        category_id: data.category_id ? _toNum(data.category_id) : null,
        name: data.name,
        barcode: data.barcode || "",
        description: data.description || "",
        harga_beli: _toNum(data.harga_beli, 0),
        harga_normal: _nullableNum(data.harga_normal),
        harga_medium: _nullableNum(data.harga_medium),
        harga_max: _nullableNum(data.harga_max),
        stock,
        stock_normal: _toNum(data.stock_normal, data.harga_normal != null ? stock : 0),
        stock_medium: _toNum(data.stock_medium, data.harga_medium != null ? stock : 0),
        stock_max: _toNum(data.stock_max, data.harga_max != null ? stock : 0),
        image_path: data.image_path || "",
        is_active: 1,
        created_at: now,
      };
      await Db.put("products", record);
      return id;
    },

    async update(id, data) {
      _validateProduct(data);
      const existing = await Db.get("products", id);
      if (!existing) throw new Error("Produk tidak ditemukan");
      const stock = _toNum(data.stock, 0);
      const updated = {
        ...existing,
        category_id: data.category_id ? _toNum(data.category_id) : null,
        name: data.name,
        barcode: data.barcode || "",
        description: data.description || "",
        harga_beli: _toNum(data.harga_beli, 0),
        harga_normal: _nullableNum(data.harga_normal),
        harga_medium: _nullableNum(data.harga_medium),
        harga_max: _nullableNum(data.harga_max),
        stock,
        stock_normal: _toNum(data.stock_normal, data.harga_normal != null ? stock : 0),
        stock_medium: _toNum(data.stock_medium, data.harga_medium != null ? stock : 0),
        stock_max: _toNum(data.stock_max, data.harga_max != null ? stock : 0),
        image_path: data.image_path != null ? data.image_path : existing.image_path,
        is_active: data.is_active != null ? _toNum(data.is_active) : existing.is_active,
      };
      await Db.put("products", updated);
      return id;
    },

    async remove(id) {
      await Db.remove("products", id);
      return id;
    },

    async toggleActive(id) {
      const p = await Db.get("products", id);
      if (!p) throw new Error("Produk tidak ditemukan");
      const newVal = p.is_active ? 0 : 1;
      p.is_active = newVal;
      await Db.put("products", p);
      return newVal;
    },

    async uploadImage(productId, filename, dataB64) {
      // In browser mode we store the image as a base64 data URL directly on
      // the product row (no server filesystem). dataB64 is raw base64; we
      // sniff a mime type from the filename extension.
      const ext = (filename || "").split(".").pop().toLowerCase();
      const mime =
        ext === "png" ? "image/png" :
        ext === "gif" ? "image/gif" :
        ext === "webp" ? "image/webp" : "image/jpeg";
      const dataUrl = `data:${mime};base64,${dataB64}`;
      const p = await Db.get("products", productId);
      if (p) {
        p.image_path = dataUrl;
        await Db.put("products", p);
      }
      return { url: dataUrl, ok: true };
    },
  };

  /* ==========================================================================
     CATEGORIES
     ========================================================================== */
  const Categories = {
    async list() {
      const rows = await Db.getAll("categories");
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return rows;
    },

    async create(name, description = "") {
      name = (name || "").trim();
      if (!name) throw new Error("Nama kategori tidak boleh kosong");
      const all = await Db.getAll("categories");
      if (all.some((c) => c.name.toLowerCase() === name.toLowerCase()))
        throw new Error("Nama kategori sudah ada");
      const id = await Db.nextId("categories");
      await Db.put("categories", {
        id,
        name,
        description: description || "",
        created_at: Db.nowStr(),
      });
      return id;
    },

    async update(id, name, description) {
      name = (name || "").trim();
      if (!name) throw new Error("Nama kategori tidak boleh kosong");
      const cat = await Db.get("categories", id);
      if (!cat) throw new Error("Kategori tidak ditemukan");
      cat.name = name;
      cat.description = description || "";
      await Db.put("categories", cat);
      return id;
    },

    async remove(id) {
      await Db.remove("categories", id);
      return id;
    },
  };

  /* ==========================================================================
     TRANSACTIONS
     ========================================================================== */
  function _priceFor(prod, size) {
    size = (size || "").trim();
    let val;
    if (!size) {
      val = prod.harga_normal;
    } else if (size === "Medium") {
      val = prod.harga_medium;
    } else if (size === "Max") {
      val = prod.harga_max;
    } else {
      val = prod.harga_normal;
    }
    if (val === null || val === undefined || val === "") {
      return size ? null : _toNum(prod.harga_normal, null);
    }
    return _toNum(val);
  }

  function _stockFor(prod, size) {
    size = (size || "").trim();
    let val;
    if (size === "Medium") val = prod.stock_medium;
    else if (size === "Max") val = prod.stock_max;
    else val = prod.stock_normal;
    if (val === null || val === undefined) return _toNum(prod.stock, 0);
    return _toNum(val, 0);
  }

  function _normalizeSize(size) {
    const s = (size || "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  async function _generateOrderId(now) {
    now = now || new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateStr = `${yy}${mm}${dd}`;
    const prefix = ((await Db.getSetting("invoice_prefix", "SC")) || "SC").toUpperCase();
    // count existing transactions whose order_id contains this date string
    const txs = await Db.getAll("transactions");
    const seq = txs.filter((t) => (t.order_id || "").includes(`-${dateStr}-`)).length + 1;
    return `${prefix}-${dateStr}-${String(seq).padStart(4, "0")}`;
  }

  function _calcDiscount(subtotal, discountType, discountValue) {
    if (!discountType || !discountValue) return 0;
    const dv = _toNum(discountValue);
    const t = (discountType || "").toLowerCase().trim();
    if (t === "percent" || t === "percentage" || t === "%") {
      const pct = Math.min(100, Math.max(0, dv));
      return Math.round(subtotal * pct / 100 * 100) / 100;
    }
    if (t === "amount" || t === "rupiah" || t === "rp") {
      return Math.min(subtotal, Math.max(0, dv));
    }
    return 0;
  }

  const Transactions = {
    PLATFORMS,

    async checkout(payload) {
      payload = payload || {};
      const platform = (payload.platform || "").trim();
      if (!platform) throw new Error("Platform pemesanan wajib dipilih");
      const items = payload.items || [];
      if (!items.length) throw new Error("Keranjang masih kosong");
      const paidAmount = _toNum(payload.paid_amount);

      const now = new Date();
      const orderId = await _generateOrderId(now);
      const pad = (n) => String(n).padStart(2, "0");
      const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      let subtotal = 0;
      let grossProfit = 0;
      const lines = [];

      for (const item of items) {
        const pid = _toNum(item.product_id);
        const size = _normalizeSize(item.size);
        const qty = _toNum(item.qty);
        if (qty <= 0) throw new Error(`Jumlah tidak valid untuk produk #${pid}`);

        const prod = await Db.get("products", pid);
        if (!prod) throw new Error(`Produk #${pid} tidak ditemukan`);
        if (!(prod.is_active == 1 || prod.is_active === true))
          throw new Error(`Produk '${prod.name}' tidak aktif`);

        const price = _priceFor(prod, size);
        if (price === null || price === undefined)
          throw new Error(`Ukuran '${size}' tidak tersedia untuk '${prod.name}'`);

        const avail = _stockFor(prod, size);
        if (avail < qty)
          throw new Error(`Stok '${prod.name}' (${size}) tidak mencukupi (sisa ${avail})`);

        const cost = _toNum(prod.harga_beli, 0);
        const lineSub = price * qty;
        subtotal += lineSub;
        grossProfit += (price - cost) * qty;

        const productName = size ? `${prod.name} (${size})` : prod.name;
        lines.push({
          product_id: pid,
          product_name: productName,
          size,
          price,
          cost,
          qty,
          subtotal: lineSub,
        });
      }

      const discountType = (payload.discount_type || "").toLowerCase().trim();
      const discountAmount = _calcDiscount(subtotal, discountType, payload.discount_value);
      const grandTotal = Math.round((subtotal - discountAmount) * 100) / 100;
      const change = Math.round((paidAmount - grandTotal) * 100) / 100;
      if (paidAmount < grandTotal)
        throw new Error(`Nominal tunai kurang (butuh Rp${grandTotal.toLocaleString("id-ID")})`);
      const netProfit = Math.round((grossProfit - discountAmount) * 100) / 100;

      const txId = await Db.nextId("transactions");
      const header = {
        id: txId,
        order_id: orderId,
        order_date: orderDate,
        platform,
        subtotal,
        discount_type: discountType,
        discount_value: _toNum(payload.discount_value),
        discount_amount: discountAmount,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        change_amount: change,
        payment_method: payload.payment_method || "CASH",
        cashier: payload.cashier || "",
        total_profit: netProfit,
        created_at: Db.nowStr(),
        details: lines,
      };
      await Db.put("transactions", header);
      header.profit = netProfit;
      return header;
    },

    async confirmCheckout(orderId) {
      const tx = await this._findByOrderId(orderId);
      if (!tx) throw new Error("Transaksi tidak ditemukan");
      // reduce stock per variant
      for (const d of tx.details || []) {
        const prod = await Db.get("products", d.product_id);
        if (!prod) continue;
        const size = _normalizeSize(d.size);
        if (size === "Medium") prod.stock_medium = Math.max(0, _toNum(prod.stock_medium) - d.qty);
        else if (size === "Max") prod.stock_max = Math.max(0, _toNum(prod.stock_max) - d.qty);
        else prod.stock_normal = Math.max(0, _toNum(prod.stock_normal) - d.qty);
        prod.stock = Math.max(0, _toNum(prod.stock) - d.qty);
        await Db.put("products", prod);
      }
      return { ok: true, order_id: orderId };
    },

    async cancelCheckout(orderId) {
      const tx = await this._findByOrderId(orderId);
      if (!tx) throw new Error("Transaksi tidak ditemukan");
      await Db.remove("transactions", tx.id);
      return { ok: true, order_id: orderId };
    },

    async get(txId) {
      const tx = await Db.get("transactions", _toNum(txId));
      return tx ? { ...tx } : null;
    },

    async getByOrderId(orderId) {
      const tx = await this._findByOrderId(orderId);
      if (!tx) return null;
      const out = { ...tx };
      out.profit = out.total_profit;
      return out;
    },

    async _findByOrderId(orderId) {
      const all = await Db.getAll("transactions");
      return all.find((t) => t.order_id === orderId) || null;
    },

    async filter(startDate = "", endDate = "", platform = "") {
      let rows = await Db.getAll("transactions");
      if (startDate) rows = rows.filter((t) => (t.order_date || "").slice(0, 10) >= startDate);
      if (endDate) rows = rows.filter((t) => (t.order_date || "").slice(0, 10) <= endDate);
      if (platform) rows = rows.filter((t) => t.platform === platform);
      rows.sort((a, b) => b.id - a.id);
      return rows;
    },

    async remove(txId) {
      await Db.remove("transactions", _toNum(txId));
      return _toNum(txId);
    },
  };

  /* ==========================================================================
     REPORTS
     ========================================================================== */
  function _totalStock(p) {
    const sum = _toNum(p.stock_normal) + _toNum(p.stock_medium) + _toNum(p.stock_max);
    return sum > 0 ? sum : _toNum(p.stock, 0);
  }

  const Reports = {
    async dashboardSummary() {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

      const txs = await Db.getAll("transactions");
      const inRange = (s, e) =>
        txs.filter((t) => {
          const d = (t.order_date || "").slice(0, 10);
          return d >= s && d <= e;
        });

      const todayTx = inRange(today, today);
      const monthTx = inRange(monthStart, today);
      const sumOf = (arr, key) => arr.reduce((s, t) => s + _toNum(t[key]), 0);

      const products = await Db.getAll("products");
      const lowStock = products
        .filter((p) => _totalStock(p) <= Db.LOW_STOCK_THRESHOLD)
        .slice(0, 10);

      // attach category_name for low stock products
      for (const p of lowStock) await _withCategoryName(p);

      return {
        today_turnover: sumOf(todayTx, "grand_total"),
        today_profit: sumOf(todayTx, "total_profit"),
        today_transactions: todayTx.length,
        month_turnover: sumOf(monthTx, "grand_total"),
        month_profit: sumOf(monthTx, "total_profit"),
        month_transactions: monthTx.length,
        total_products: products.length,
        active_products: products.filter((p) => p.is_active == 1).length,
        low_stock_count: lowStock.length,
        low_stock_products: lowStock,
      };
    },

    async dailyRevenue(days = 7) {
      days = _toNum(days, 7);
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - (days - 1));
      const txs = await Db.getAll("transactions");

      const byDay = {};
      txs.forEach((t) => {
        const day = (t.order_date || "").slice(0, 10);
        if (!byDay[day]) byDay[day] = { turnover: 0, profit: 0, count: 0 };
        byDay[day].turnover += _toNum(t.grand_total);
        byDay[day].profit += _toNum(t.total_profit);
        byDay[day].count += 1;
      });

      const out = [];
      const pad = (n) => String(n).padStart(2, "0");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const agg = byDay[key] || { turnover: 0, profit: 0, count: 0 };
        out.push({
          day: key,
          label: `${pad(d.getDate())} ${monthNames[d.getMonth()]}`,
          turnover: agg.turnover,
          profit: agg.profit,
          count: agg.count,
        });
      }
      return out;
    },

    async financialReport(startDate = "", endDate = "", platform = "") {
      const transactions = await Transactions.filter(startDate, endDate, platform);
      // totals computed from the filtered set (note: platform applies to totals too here)
      const totals = {
        turnover: transactions.reduce((s, t) => s + _toNum(t.grand_total), 0),
        profit: transactions.reduce((s, t) => s + _toNum(t.total_profit), 0),
        count: transactions.length,
      };
      return { transactions, totals };
    },
  };

  /* ==========================================================================
     SETTINGS
     ========================================================================== */
  const Settings = {
    async getDict() {
      return Db.getAllSettings();
    },

    async update(data) {
      if (!data || !Object.keys(data).length) throw new Error("Tidak ada data untuk disimpan");
      const cleaned = {};
      for (const [k, v] of Object.entries(data)) cleaned[k] = v === null || v === undefined ? "" : v;
      await Db.setManySettings(cleaned);
      return this.getDict();
    },

    async uploadQrImage(filename, dataB64) {
      // store as data URL in settings
      const ext = (filename || "").split(".").pop().toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
      const url = `data:${mime};base64,${dataB64}`;
      await Db.setManySettings({ qr_image: url, qr_mode: "image" });
      return { url, ok: true };
    },

    async uploadAppLogo(filename, dataB64) {
      const ext = (filename || "").split(".").pop().toLowerCase();
      const mime =
        ext === "png" ? "image/png" :
        ext === "gif" ? "image/gif" :
        ext === "webp" ? "image/webp" : "image/jpeg";
      const url = `data:${mime};base64,${dataB64}`;
      await Db.setSetting("app_logo", url);
      return { url, ok: true };
    },

    async uploadAppIcon(filename, dataB64) {
      // In browser mode we just store the data URL; no .ico conversion needed.
      const ext = (filename || "").split(".").pop().toLowerCase();
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      const url = `data:${mime};base64,${dataB64}`;
      await Db.setSetting("app_icon", url);
      return { url, ok: true };
    },

    async updateWindowTitle(title) {
      await Db.setSetting("app_title", title);
      return { title, ok: true };
    },
  };

  /* ==========================================================================
     Printer stubs — browser mode uses window.print() (handled in view layer)
     ========================================================================== */
  const Printer = {
    async getPrinterList() {
      return { printers: [], default: "", saved: "" };
    },
    async checkPrinterConnected() {
      return { printer_name: "", connected: true };
    },
    async savePrinter(name, paperWidthMm) {
      await Db.setSetting("printer_name", (name || "").trim());
      if (paperWidthMm != null && paperWidthMm !== "") {
        const mm = parseInt(paperWidthMm, 10);
        if (!isNaN(mm)) {
          await Db.setManySettings({ paper_width: String(mm), paper_chars: String(Math.round(mm * 0.55)) });
        }
      }
      return { printer_name: (name || "").trim(), ok: true };
    },
    async testPrint() {
      // No silent printing in browser mode; the view layer handles window.print().
      return { success: true, message: "Gunakan tombol Cetak untuk mencetak struk." };
    },
    async printReceipt() {
      return { success: true, message: "Gunakan tombol Cetak untuk mencetak struk." };
    },
  };

  /* ---------- public surface ---------- */
  const Backend = {
    Auth,
    Products,
    Categories,
    Transactions,
    Reports,
    Settings,
    Printer,
    isLoggedIn,
    isAdmin,
    requireLogin,
    requireAdmin,
  };

  global.Backend = Backend;
})(window);
