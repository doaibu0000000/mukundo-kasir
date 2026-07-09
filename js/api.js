/* ==========================================================================
   api.js — typed async wrapper around the client-side Backend

   This is the SINGLE interface the rest of the app uses. The public `API`
   object has the EXACT same method signatures as the old pywebview / fetch
   builds, so no view (.js) file needs to change. The only difference is the
   underlying transport: instead of calling a server, each method delegates
   to the in-browser Backend (IndexedDB + localStorage).
   ========================================================================== */
(function (global) {
  "use strict";

  // Wrap a backend call so thrown Errors propagate unchanged.
  async function run(fn) {
    return await fn();
  }

  const API = {
    // system
    ping: () => Promise.resolve("pong"),
    getAppInfo: () =>
      Promise.resolve({ name: "Mokundo Kasir", version: "2.0.0", db_status: "ok" }),

    // auth
    login: (u, p) => run(() => Backend.Auth.login(u, p)),
    logout: () => run(() => Backend.Auth.logout()),
    currentUser: () => Promise.resolve(Backend.Auth.currentUser()),
    whoami: () => {
      Backend.requireLogin();
      return Promise.resolve(Backend.Auth.currentUser());
    },

    // products
    listProducts: (active_only = true) => run(() => Backend.Products.list(active_only)),
    searchProducts: (kw = "", cat = 0) => run(() => Backend.Products.search(kw, cat)),
    getProduct: (id) => run(() => Backend.Products.get(id)),
    createProduct: (data) => {
      Backend.requireAdmin();
      return run(() => Backend.Products.create(data)).then((id) => ({ id, ok: true }));
    },
    updateProduct: (id, data) => {
      Backend.requireAdmin();
      return run(() => Backend.Products.update(id, data)).then(() => ({ id, ok: true }));
    },
    deleteProduct: (id) => {
      Backend.requireAdmin();
      return run(() => Backend.Products.remove(id)).then(() => ({ id, ok: true }));
    },
    toggleProduct: (id) => {
      Backend.requireAdmin();
      return run(() =>
        Backend.Products.toggleActive(id).then((v) => ({ id, is_active: v, ok: true }))
      );
    },
    uploadProductImage: (id, filename, b64) => {
      Backend.requireAdmin();
      return run(() => Backend.Products.uploadImage(id, filename, b64));
    },

    // categories
    listCategories: () => run(() => Backend.Categories.list()),
    createCategory: (name, desc) => {
      Backend.requireAdmin();
      return run(() => Backend.Categories.create(name, desc)).then((id) => ({ id, ok: true }));
    },
    updateCategory: (id, name, desc) => {
      Backend.requireAdmin();
      return run(() => Backend.Categories.update(id, name, desc)).then(() => ({ id, ok: true }));
    },
    deleteCategory: (id) => {
      Backend.requireAdmin();
      return run(() => Backend.Categories.remove(id)).then(() => ({ id, ok: true }));
    },

    // transactions
    checkout: (payload) => {
      Backend.requireLogin();
      // tag cashier from session (mirrors the old server behaviour)
      const u = Backend.Auth.currentUser();
      payload.cashier = (u || {}).username || "";
      return run(() => Backend.Transactions.checkout(payload));
    },
    confirmCheckout: (orderId) => {
      Backend.requireLogin();
      return run(() => Backend.Transactions.confirmCheckout(orderId));
    },
    cancelCheckout: (orderId) => {
      Backend.requireLogin();
      return run(() => Backend.Transactions.cancelCheckout(orderId));
    },
    getTransaction: (id) => {
      Backend.requireLogin();
      return run(() => Backend.Transactions.get(id));
    },
    getTransactionByOrder: (oid) => {
      Backend.requireLogin();
      return run(() => Backend.Transactions.getByOrderId(oid));
    },
    listTransactions: (s = "", e = "", p = "") => {
      Backend.requireAdmin();
      return run(() => Backend.Transactions.filter(s, e, p));
    },
    deleteTransaction: (id) => {
      Backend.requireAdmin();
      return run(() => Backend.Transactions.remove(id)).then(() => ({ id, ok: true }));
    },

    // reports
    dashboardSummary: () => {
      Backend.requireAdmin();
      return run(() => Backend.Reports.dashboardSummary());
    },
    dailyRevenue: (days = 7) => {
      Backend.requireAdmin();
      return run(() => Backend.Reports.dailyRevenue(days));
    },
    financialReport: (s = "", e = "", p = "") => {
      Backend.requireAdmin();
      return run(() => Backend.Reports.financialReport(s, e, p));
    },

    // settings
    getSettings: () => {
      Backend.requireLogin();
      return run(() => Backend.Settings.getDict());
    },
    // public settings (for login page branding — no auth needed)
    getPublicSettings: () => run(() => Backend.Settings.getDict()),
    updateSettings: (data) => {
      Backend.requireAdmin();
      return run(() => Backend.Settings.update(data));
    },
    uploadQrImage: (filename, b64) => {
      Backend.requireAdmin();
      return run(() => Backend.Settings.uploadQrImage(filename, b64));
    },

    // app branding
    uploadAppLogo: (filename, b64) => {
      Backend.requireAdmin();
      return run(() => Backend.Settings.uploadAppLogo(filename, b64));
    },
    uploadAppIcon: (filename, b64) => {
      Backend.requireAdmin();
      return run(() => Backend.Settings.uploadAppIcon(filename, b64));
    },
    updateWindowTitle: (title) => {
      Backend.requireAdmin();
      return run(() => Backend.Settings.updateWindowTitle(title));
    },

    // printer — browser mode uses window.print() (handled in transaction.js)
    getPrinterList: () => {
      Backend.requireLogin();
      return run(() => Backend.Printer.getPrinterList());
    },
    checkPrinterConnected: (name) => {
      Backend.requireLogin();
      return run(() => Backend.Printer.checkPrinterConnected(name || ""));
    },
    savePrinter: (name, paperWidthMm) => {
      Backend.requireLogin();
      return run(() => Backend.Printer.savePrinter(name || "", paperWidthMm));
    },
    testPrint: (name) => {
      Backend.requireLogin();
      return run(() => Backend.Printer.testPrint(name || ""));
    },
    printReceipt: (data) => {
      Backend.requireLogin();
      return run(() => Backend.Printer.printReceipt(data));
    },
  };

  global.API = API;
})(window);
