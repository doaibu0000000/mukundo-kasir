/* ==========================================================================
   notify.js — SweetAlert2 wrappers, styled with the neumorphism classes
   ========================================================================== */
(function (global) {
  "use strict";

  const BASE = {
    customClass: { popup: "neu-popup" },
    buttonsStyling: true,
    showClass: { popup: "swal2-show" },
    hideClass: { popup: "swal2-hide" },
  };

  const Notify = {
    error(title, text = "") {
      return Swal.fire({ ...BASE, icon: "error", title, text });
    },
    warning(title, text = "") {
      return Swal.fire({ ...BASE, icon: "warning", title, text });
    },
    info(title, text = "") {
      return Swal.fire({ ...BASE, icon: "info", title, text });
    },
    success(title, text = "") {
      return Swal.fire({ ...BASE, icon: "success", title, text });
    },

    /* confirmation with a Neumorphic confirm button */
    confirm(title, text = "", opts = {}) {
      return Swal.fire({
        ...BASE,
        icon: "warning",
        title,
        text,
        showCancelButton: true,
        confirmButtonText: opts.confirmText || "Ya, lanjutkan",
        cancelButtonText: "Batal",
        confirmButtonColor: "#c44a58",
        cancelButtonColor: "#a3b1c6",
        reverseButtons: true,
      }).then((r) => r.isConfirmed);
    },

    /* "Access Denied" alert for RBAC */
    accessDenied(msg = "Anda tidak memiliki hak akses untuk fitur ini.") {
      return Swal.fire({
        ...BASE,
        icon: "error",
        title: "Akses Ditolak",
        text: msg,
        confirmButtonColor: "#c44a58",
      });
    },

    /* loading toast that resolves when closed */
    loading(title = "Memproses…") {
      Swal.fire({
        ...BASE,
        title,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });
    },
    close() { Swal.close(); },

/* a Neumorphic form-style modal (html provided) */
    modal({ title, html, confirmText = "Simpan", cancelText = "Batal", width }) {
      return Swal.fire({
        ...BASE,
        title,
        html,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: "#5d83ad",
        cancelButtonColor: "#a3b1c6",
        reverseButtons: true,
        width,
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: () => !Swal.isLoading(),
        didOpen: () => {
          /* Keep the cancel (Batal) button always clickable —
             SweetAlert2 disables it while preConfirm is resolving.
             We override that behaviour so the user can always dismiss. */
          const observer = new MutationObserver(() => {
            const cancelBtn = document.querySelector(".swal2-cancel");
            if (cancelBtn && cancelBtn.disabled) {
              cancelBtn.disabled = false;
              cancelBtn.classList.remove("swal2-loading");
            }
          });
          const cancelBtn = document.querySelector(".swal2-cancel");
          if (cancelBtn) {
            observer.observe(cancelBtn, { attributes: true, attributeFilter: ["disabled", "class"] });
          }
          /* Store observer so it disconnects when modal closes */
          const popup = document.querySelector(".swal2-popup");
          if (popup) {
            new MutationObserver(() => {
              if (!document.querySelector(".swal2-popup")) observer.disconnect();
            }).observe(popup.parentNode, { childList: true });
          }
        },
        preConfirm: () => {
          if (typeof global.__modalPreConfirm === "function") {
            try { return global.__modalPreConfirm(); }
            catch (e) { Swal.showValidationMessage(e.message); return false; }
          }
          return true;
        },
      });
    },
  };

  global.Notify = Notify;
})(window);
