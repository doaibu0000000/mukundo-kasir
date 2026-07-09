/* ==========================================================================
   app.js — application bootstrap & shell wiring
   ========================================================================== */
(function (global) {
  "use strict";

  const App = {
    async boot() {
      // wait for DOM ready
      await this.domReady();

      // Initialise the in-browser database (IndexedDB) before anything else.
      try {
        await Db.init();
      } catch (e) {
        console.error("[Boot] Gagal inisialisasi database:", e);
      }

      // Hook up the PWA install button as early as possible so we don't miss
      // the beforeinstallprompt event.
      this.initPwaInstall();

      // Initialise theme (pre-paint already set <html data-theme>)
      Theme.init();

      // Live-refresh the dashboard chart when the user toggles the theme
      Theme.onChange(() => {
        if (typeof DashboardView !== "undefined" && DashboardView.retintChart) {
          DashboardView.retintChart();
        }
      });

      // Hide global loader
      Helpers.$("#app-loader").classList.add("hidden");

      // init login form
      LoginView.init();

      // global window error handler for RBAC exceptions bubbling up
      global.addEventListener("unhandledrejection", (e) => {
        const msg = (e.reason && e.reason.message) || String(e.reason || "");
        if (/unauthorized|akses ditolak/i.test(msg)) {
          Notify.accessDenied();
          e.preventDefault();
        }
      });

      // If a session somehow exists (e.g. reload), restore it
      try {
        const user = await API.currentUser();
        if (user) {
          State.setUser(user);
          await State.loadSettings();
          this.applyAppBranding();
          this.enterApp();
          return;
        }
      } catch (_) { /* not logged in */ }

      this.showLogin();
    },

    domReady() {
      return new Promise((res) => {
        if (document.readyState !== "loading") return res();
        document.addEventListener("DOMContentLoaded", res, { once: true });
      });
    },

    /* ---------- PWA install (Progressive Web App) ----------
       The browser fires `beforeinstallprompt` when the app is installable
       (valid manifest + SW + engagement). We capture it, show a button in
       the sidebar, and call prompt() when the user clicks it. */
    _deferredPrompt: null,

    initPwaInstall() {
      const btn = Helpers.$("#btn-install-app");
      if (!btn) return;

      // Capture the install event the browser offers us.
      global.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault(); // stop the default mini-infobar
        this._deferredPrompt = e;
        btn.classList.remove("hidden");
      });

      // Hide the button once installed (so it doesn't show after install).
      global.addEventListener("appinstalled", () => {
        this._deferredPrompt = null;
        btn.classList.add("hidden");
      });

      // Detect apps already running standalone (installed) -> hide button.
      if (
        global.matchMedia("(display-mode: standalone)").matches ||
        global.navigator.standalone === true
      ) {
        btn.classList.add("hidden");
        return;
      }

      // Wire the click -> show the native install prompt.
      btn.addEventListener("click", async () => {
        if (!this._deferredPrompt) {
          Notify.info(
            "Belum bisa install",
            "Browser belum menawarkan opsi install. Coba: menu browser → 'Add to Home screen' / 'Install app'."
          );
          return;
        }
        this._deferredPrompt.prompt();
        const { outcome } = await this._deferredPrompt.userChoice;
        this._deferredPrompt = null; // can only be used once
        if (outcome === "accepted") {
          btn.classList.add("hidden");
          Notify.success("Terinstall!", "Aplikasi siap dipakai dari home screen.");
        }
      });
    },

    showLogin() {
      Helpers.$("#screen-app").classList.add("hidden");
      Helpers.$("#screen-login").classList.remove("hidden");
      Helpers.$("#login-username").focus();
    },

    /* Apply branding from settings to sidebar, login, and document title */
    applyAppBranding() {
      const s = State.settings || {};
      const appName = s.app_name || "Mokundo";
      const appTitle = s.app_title || (appName + " Kasir");
      const appLogo = s.app_logo || "";

      // Sidebar brand name
      const sidebarBrand = Helpers.$("#sidebar-brand");
      if (sidebarBrand) sidebarBrand.textContent = appName;

      // Sidebar logo
      const sidebarLogo = Helpers.$("#sidebar-logo");
      if (sidebarLogo) {
        if (appLogo) {
          sidebarLogo.innerHTML = `<img src="${appLogo}" class="w-8 h-8 rounded-xl object-cover"/>`;
          sidebarLogo.classList.remove("text-xl");
        }
      }

      // Login brand name
      const loginBrand = Helpers.$("#login-brand");
      if (loginBrand) loginBrand.textContent = appName + " Kasir";

      // Login logo
      const loginLogo = Helpers.$("#login-logo");
      if (loginLogo) {
        if (appLogo) {
          loginLogo.innerHTML = `<img src="${appLogo}" class="w-14 h-14 rounded-full object-cover"/>`;
        }
      }

      // Document title
      document.title = appTitle;
    },

    enterApp() {
      Helpers.$("#screen-login").classList.add("hidden");
      Helpers.$("#screen-app").classList.remove("hidden");

      // user badge in sidebar
      const u = State.user || {};
      Helpers.$("#user-avatar").textContent = (u.full_name || u.username || "?").charAt(0).toUpperCase();
      Helpers.$("#user-name").textContent = u.full_name || u.username || "—";
      Helpers.$("#user-role").textContent = u.role || "—";

      // logout
      const btn = Helpers.$("#btn-logout");
      btn.onclick = null;
      btn.addEventListener("click", () => this.logout());

      // apply branding (sidebar name, logo, title)
      this.applyAppBranding();

      // theme toggle switch (available to both admin & cashier)
      const slot = Helpers.$("#theme-switch-slot");
      slot.innerHTML = "";
      slot.appendChild(Theme.makeSwitch());

      // navigate to role-based home
      Router.navigate(Router.home());
    },

    async logout() {
      const ok = await Notify.confirm("Keluar dari aplikasi?", "Anda akan dikembalikan ke halaman login.");
      if (!ok) return;
      try { await API.logout(); } catch (_) {}
      State.clearUser();

      // Reset SPA state & security: hapus DOM cache agar Kasir tidak bisa mengakses sisa halaman Admin
      if (typeof Router !== "undefined") {
        Router._menuBuilt = false;
        Router._initialized = {};
        Router.current = null;
        document.querySelectorAll(".view-slot").forEach(el => el.remove());
      }

      this.showLogin();
    },
  };

  global.App = App;

  // auto boot
  App.boot();
})(window);
