/* ==========================================================================
   views/login.js — login screen logic
   ========================================================================== */
(function (global) {
  "use strict";

  const LoginView = {
    init() {
      const form = Helpers.$("#login-form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submit();
      });

      // Toggle show/hide password
      const toggleBtn = Helpers.$("#toggle-password");
      const passwordInput = Helpers.$("#login-password");
      const eyeOff = Helpers.$("#eye-off");
      const eyeOn = Helpers.$("#eye-on");
      toggleBtn.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        eyeOff.classList.toggle("hidden", isPassword);
        eyeOn.classList.toggle("hidden", !isPassword);
      });

      // Apply branding to login screen
      this.applyBranding();
    },

    async applyBranding() {
      try {
        const s = await API.getPublicSettings();
        const appName = s.app_name || "Mokundo";
        const appLogo = s.app_logo || "";

        const loginBrand = Helpers.$("#login-brand");
        if (loginBrand) loginBrand.textContent = appName + " Kasir";

        if (appLogo) {
          const loginLogo = Helpers.$("#login-logo");
          if (loginLogo) {
            loginLogo.innerHTML = `<img src="${appLogo}" class="w-14 h-14 rounded-full object-cover"/>`;
          }
        }

        document.title = s.app_title || (appName + " Kasir");
      } catch (_) {
        // If API not ready, use defaults — branding will be applied on login success
      }
    },

    async submit() {
      const username = Helpers.$("#login-username").value.trim();
      const password = Helpers.$("#login-password").value.trim();
      if (!username || !password) {
        Notify.warning("Lengkapi username dan password");
        return;
      }
      try {
        const user = await API.login(username, password);
        State.setUser(user);
        await State.loadSettings();
        App.enterApp();
      } catch (e) {
        Notify.error("Login Gagal", e.message || "Username atau password salah");
      }
    },
  };

  global.LoginView = LoginView;
})(window);
