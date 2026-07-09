/* ==========================================================================
   helpers.js — small pure utilities used across the app
   ========================================================================== */
(function (global) {
  "use strict";

  const Helpers = {
    /* ---------- number / currency ---------- */
    rp(n) {
      const v = Number(n || 0);
      return "Rp" + v.toLocaleString("id-ID");
    },
    num(n) {
      return Number(n || 0);
    },
    formatQty(n) {
      return Number(n || 0).toLocaleString("id-ID");
    },

    /* ---------- dates ---------- */
    todayISO() {
      return new Date().toISOString().slice(0, 10);
    },
    formatDate(d) {
      if (!d) return "";
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = dt.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    },
    formatDateTime(d) {
      if (!d) return "";
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = dt.getFullYear();
      const hh = String(dt.getHours()).padStart(2, "0");
      const mi = String(dt.getMinutes()).padStart(2, "0");
      return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
    },

    /* ---------- DOM ---------- */
    $(sel, root = document) { return root.querySelector(sel); },
    $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
    el(tag, attrs = {}, children = []) {
      const node = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v !== null && v !== undefined) {
          node.setAttribute(k, v);
        }
      }
      for (const c of [].concat(children)) {
        if (c == null) continue;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
      return node;
    },

    /* ---------- file -> base64 ---------- */
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // strip the "data:image/png;base64," prefix
          const result = reader.result.split(",")[1] || "";
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    /* ---------- escape html ---------- */
    escape(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },

    /* ---------- debounce ---------- */
    debounce(fn, ms = 250) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
      };
    },
  };

  global.Helpers = Helpers;
})(window);
