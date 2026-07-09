/* ==========================================================================
   state.js — central application state (logged-in user + cached settings)
   The browser holds NO role token that grants privileges; the Python session
   is the source of truth. This state only drives what UI is *shown*.
   ========================================================================== */
(function (global) {
  "use strict";

  const State = {
    user: null,        // {id, username, role, full_name}
    settings: null,    // store settings dict
    cart: [],          // active cart for the transaction page
    currentView: null,

    get isAdmin()    { return this.user && this.user.role && this.user.role.toLowerCase() === "admin"; },
    get isCashier()  { return this.user && this.user.role && this.user.role.toLowerCase() === "kasir"; },
    get isLoggedIn() { return !!this.user; },

    setUser(u)       { this.user = u; this._broadcast(); },
    clearUser()      { this.user = null; this.cart = []; this._broadcast(); },

    async loadSettings() {
      try { this.settings = await API.getSettings(); }
      catch (e) { this.settings = {}; }
      return this.settings;
    },

    /* simple pub/sub so the sidebar re-renders on login/logout */
    _subs: [],
    subscribe(fn) { this._subs.push(fn); },
    _broadcast() { this._subs.forEach((fn) => { try { fn(this); } catch (_) {} }); },
  };

  global.State = State;
})(window);
