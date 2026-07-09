/* ==========================================================================
   router.js — lightweight SPA router with tab-switching & view caching.

   Architecture:
     - Each route maps to a view module with `init()` (first-time DOM build)
       and `onShow()` (refresh data on subsequent visits).
     - `init()` is called only ONCE per view (lazy); subsequent navigations
       call `onShow()` instead — the DOM is kept alive, so switching tabs is
       instant with zero blank flash.
     - `renderMenu()` is called once on login; after that only the active
       class is toggled on the existing nav items.
   ========================================================================== */
(function (global) {
  "use strict";

  const ROUTES = [
    { id: "dashboard",   label: "Dashboard",     icon: "📊", admin: true,  title: "Dashboard",        subtitle: "Ringkasan operasional toko", view: () => DashboardView },
    { id: "transaction", label: "Transaksi",     icon: "🛒", admin: false, title: "Transaksi Penjualan", subtitle: "Buat transaksi & cetak struk", view: () => TransactionView },
    { id: "products",    label: "Produk",        icon: "📦", admin: true,  title: "Manajemen Produk", subtitle: "Kelola produk & varian harga", view: () => ProductsView },
    { id: "categories",  label: "Kategori",      icon: "🏷️", admin: true,  title: "Kategori Produk",  subtitle: "Kelola kategori", view: () => CategoriesView },
    { id: "reports",     label: "Laporan",       icon: "📈", admin: true,  title: "Laporan Keuangan", subtitle: "Omset, profit & histori transaksi", view: () => ReportsView },
    { id: "settings",    label: "Pengaturan",    icon: "⚙️", admin: true,  title: "Pengaturan Toko",  subtitle: "Pengaturan Struk & Pengaturan Aplikasi", view: () => SettingsView },
  ];

  const Router = {
    current: null,
    _initialized: {},   // tracks which views have had their DOM built
    _menuBuilt: false,   // tracks whether the sidebar nav has been rendered

    available() {
      return ROUTES.filter((r) => !r.admin || State.isAdmin);
    },

    /* Build the sidebar nav items once. Subsequent navigations only toggle
       the active class — no DOM destruction/recreation. */
    renderMenu() {
      const host = Helpers.$("#nav-menu");
      host.innerHTML = "";
      this.available().forEach((r) => {
        const item = Helpers.el("div", {
          class: "nav-item" + (this.current === r.id ? " active" : ""),
          "data-route": r.id,
          onclick: () => this.navigate(r.id),
        });
        item.innerHTML = `<span class="nav-ico">${r.icon}</span><span>${r.label}</span>`;
        host.appendChild(item);
      });
      this._menuBuilt = true;
    },

    /* Lightweight: only toggle the active class on nav items. */
    updateActiveItem() {
      Helpers.$$(".nav-item").forEach((el) => {
        el.classList.toggle("active", el.dataset.route === this.current);
      });
    },

    async navigate(id) {
      const route = ROUTES.find((r) => r.id === id);
      if (!route) return;

      if (route.admin && !State.isAdmin) {
        Notify.accessDenied("Halaman ini hanya untuk Admin.");
        return;
      }

      this.current = id;
      Helpers.$("#page-title").textContent = route.title;
      Helpers.$("#page-subtitle").textContent = route.subtitle;
      Helpers.$("#page-actions").innerHTML = "";

      if (!this._menuBuilt) this.renderMenu();
      else this.updateActiveItem();

      const View = route.view();
      State.currentView = id;

      // Tab Switching: Siapkan container spesifik jika belum ada
      let container = document.getElementById(`view-${id}`);
      if (!container) {
        container = document.createElement("div");
        container.id = `view-${id}`;
        container.className = "view-slot";
        Helpers.$("#view-root").appendChild(container);
      }

      // Sembunyikan semua container, lalu tampilkan yang aktif
      document.querySelectorAll(".view-slot").forEach((el) => el.classList.add("hidden"));
      container.classList.remove("hidden");

      try {
        if (this._initialized[id]) {
          // View already built — just refresh data
          if (typeof View.onShow === "function") await View.onShow();
        } else {
          // First visit — build DOM, bind events, load data
          this._initialized[id] = true;
          await View.render();
        }
      } catch (e) {
        container.innerHTML = `<div class="neu-card rounded-3xl p-10 text-center text-slate-400">Gagal memuat halaman: ${Helpers.escape(e.message)}</div>`;
      }
    },

    home() {
      return State.isAdmin ? "dashboard" : "transaction";
    },
  };

  global.Router = Router;
})(window);
