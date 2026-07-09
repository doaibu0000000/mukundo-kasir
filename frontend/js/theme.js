/* ==========================================================================
   theme.js — Dark / Light theme manager

   The actual <html data-theme="..."> is set as early as possible by an inline
   script in index.html (before first paint) to avoid a flash. This module is
   the public API the rest of the app uses to read/switch the theme and to
   re-tint Chart.js instances when the palette changes.
   ========================================================================== */
(function (global) {
  "use strict";

  const STORAGE_KEY = "pos.theme";
  const THEMES = { LIGHT: "light", DARK: "dark" };

  const Theme = {
    get() {
      return document.documentElement.getAttribute("data-theme") || THEMES.LIGHT;
    },
    isDark() { return this.get() === THEMES.DARK; },

    set(theme) {
      const next = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
      this._syncToggleUI();
      this._notify();
    },

    toggle() {
      this.set(this.isDark() ? THEMES.LIGHT : THEMES.DARK);
      return this.get();
    },

    /* ---------- palette for Chart.js ---------- */
    palette() {
      const dark = this.isDark();
      return {
        // tick/label colour: faint on dark, faint slate on light
        text:       dark ? "#9a9a9a" : "#8b929b",
        grid:       dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
        accent:     dark ? "#5b9bd5" : "#2f6fb0",
        accent2:    dark ? "#b07bd5" : "#8750b5",
        success:    dark ? "#3ec97a" : "#1f9d57",
        danger:     dark ? "#ef4d5a" : "#d63342",
        accentBar:  dark ? "#5b9bd5" : "#2f6fb0",
        successBar: dark ? "#3ec97a" : "#1f9d57",
      };
    },

    /* ---------- pub/sub so charts re-render on switch ---------- */
    _subs: [],
    onChange(fn) { this._subs.push(fn); },
    _notify() { this._subs.forEach((fn) => { try { fn(this.get()); } catch (_) {} }); },

    /* ---------- keep the visible switch in sync ---------- */
    _syncToggleUI() {
      const labels = global.document.querySelectorAll("[data-theme-label]");
      const tracks = global.document.querySelectorAll("[data-theme-track]");
      labels.forEach((el) => {
        el.textContent = this.isDark() ? "Dark Mode" : "Light Mode";
      });
      tracks.forEach((el) => {
        const thumb = el.querySelector(".theme-thumb");
        if (thumb) thumb.textContent = this.isDark() ? "🌙" : "☀️";
      });
    },

    /* ---------- build a switch element (for sidebar / settings) ---------- */
    makeSwitch() {
      const wrap = document.createElement("div");
      wrap.className = "theme-switch";
      wrap.setAttribute("role", "switch");
      wrap.setAttribute("tabindex", "0");
      wrap.innerHTML = `
        <span data-theme-label>${this.isDark() ? "Dark Mode" : "Light Mode"}</span>
        <span class="theme-track" data-theme-track>
          <span class="theme-thumb">${this.isDark() ? "🌙" : "☀️"}</span>
        </span>`;
      const action = () => { this.toggle(); };
      wrap.addEventListener("click", action);
      wrap.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); action(); }
      });
      return wrap;
    },

    init() {
      this._syncToggleUI();
      this._notify();
    },
  };

  global.Theme = Theme;
})(window);
