/* ==========================================================================
   views/settings.js — store profile + QR via WhatsApp number
   ========================================================================== */
(function (global) {
  "use strict";

  const SettingsView = {
    async render() {
      const root = Helpers.$("#view-settings");
      root.innerHTML = `
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <!-- store profile (kiri) -->
          <form id="set-form" class="neu-card rounded-3xl p-6 space-y-5 self-start">
            <h3 class="font-semibold text-slate-700 mb-2">🧾 Pengaturan Struk</h3>

            <div class="neu-inset rounded-2xl p-4 space-y-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1 ml-1">NAMA TOKO</label>
                <input id="s-name" class="neu-input" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1 ml-1">ALAMAT</label>
                <textarea id="s-address" rows="3" class="neu-textarea"></textarea>
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1 ml-1">TELEPON</label>
                <input id="s-phone" class="neu-input" />
              </div>
            </div>

            <h3 class="font-semibold text-slate-700 pt-2">Catatan Nota</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <!-- Kolom Kiri: QR Code Nota -->
              <div class="neu-inset rounded-2xl p-4 space-y-3">
                <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">QR Code Nota</p>

                <div>
                  <label class="block text-xs text-slate-400 mb-1 ml-1">JENIS TAUTAN</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" id="qr-mode-wa" class="neu-btn is-active">💬 WhatsApp</button>
                    <button type="button" id="qr-mode-custom" class="neu-btn">🔗 Custom URL</button>
                  </div>
                </div>

                <div id="qr-wa-fields">
                  <div>
                    <label class="block text-xs text-slate-400 mb-1 ml-1">NOMOR WHATSAPP</label>
                    <input id="s-wa-number" class="neu-input" inputmode="numeric" placeholder="081234567890" />
                    <p id="s-wa-number-warn" class="text-xs text-red-400 hidden mt-1 ml-1">Hanya boleh berisi angka!</p>
                  </div>

                  <div>
                    <label class="block text-xs text-slate-400 mb-1 ml-1">PESAN OTOMATIS</label>
                    <textarea id="s-wa-message" rows="3" class="neu-textarea" placeholder="Halo kak, boleh saya tau tentang produk ini?"></textarea>
                  </div>
                </div>

                <div id="qr-custom-fields" class="hidden">
                  <div>
                    <label class="block text-xs text-slate-400 mb-1 ml-1">INPUT URL</label>
                    <input id="s-custom-url" class="neu-input" placeholder="https://youtube.com/..." />
                  </div>
                </div>
              </div>

              <!-- Kolom Kanan: Footer + Preview + Thanks -->
              <div class="flex flex-col gap-4">
                <div class="neu-inset rounded-2xl p-4 space-y-3">
                  <label class="block text-xs text-slate-400 mb-1 ml-1">PROMO / FOOTER</label>
                  <textarea id="s-footer" rows="2" class="neu-textarea"></textarea>
                </div>

                <div class="neu-inset rounded-2xl p-4 flex flex-col items-center">
                  <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Pratinjau QR</p>
                  <div id="qr-live" class="w-40 h-40 rounded-xl neu-pressed flex items-center justify-center overflow-hidden bg-white"></div>
                </div>

                <div class="neu-inset rounded-2xl p-4 space-y-3">
                  <label class="block text-xs text-slate-400 mb-1 ml-1">UCAPAN TERIMA KASIH</label>
                  <input id="s-thanks" class="neu-input" />
                </div>
              </div>
            </div>

            <!-- Pengaturan Printer -->
            <div class="neu-inset rounded-2xl p-4 space-y-3">
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">🖨️ Pengaturan Struk</p>
              <p class="text-xs text-slate-400 ml-1">Pilih lebar kertas struk thermal. Saat cetak, dialog cetak browser akan muncul — pilih printer thermal Anda lalu klik Cetak.</p>

              <div class="neu-inset rounded-xl p-3">
                <p class="text-xs text-slate-400 leading-relaxed">💡 <strong>Mode Web:</strong> Pencetakan struk menggunakan dialog cetak browser. Pilih printer <code>thermal</code> Anda di dialog, set margin ke <code>None</code>, lalu cetak. Lebar kertas di bawah menentukan ukuran struk.</p>
              </div>

              <div>
                <label class="block text-xs text-slate-400 mb-1 ml-1">LEBAR KERTAS</label>
                <div class="flex flex-wrap items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="paper-width" value="58" class="paper-w-radio" />
                    <span class="text-sm text-slate-500">58mm</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="paper-width" value="80" class="paper-w-radio" />
                    <span class="text-sm text-slate-500">80mm</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="paper-width" value="custom" class="paper-w-radio" />
                    <span class="text-sm text-slate-500">Custom</span>
                    <input id="s-paper-custom" type="number" min="30" max="120" class="neu-input" style="width:80px" placeholder="mm" />
                  </label>
                </div>
              </div>

              <!-- Tombol tes cetak (buka dialog print browser) -->
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" id="btn-cetak-tes" class="neu-btn">🧾 Tes Cetak Struk</button>
                <span id="printer-status" class="text-xs ml-1"></span>
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button type="submit" class="neu-btn-primary">Simpan Pengaturan</button>
            </div>
          </form>

          <!-- ===== Pengaturan Aplikasi (kanan) ===== -->
          <div class="neu-card rounded-3xl p-6 space-y-4 self-start">
            <h3 class="font-semibold text-slate-700">🛠️ Pengaturan Aplikasi</h3>
            <p class="text-xs text-slate-400">Ubah nama aplikasi, logo, dan ikon yang tampil di sidebar, login, dan jendela utama.</p>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <!-- Nama & Title -->
              <div class="neu-inset rounded-2xl p-4 space-y-3">
                <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Nama & Title</p>

                <div>
                  <input id="s-app-name" class="neu-input" placeholder="NAMA APLIKASI" />
                </div>
                <div>
                  <input id="s-app-title" class="neu-input" placeholder="TITLE WINDOW" />
                  <p id="s-title-warn" class="text-xs mt-1 ml-1 hidden" style="color:#ff4d4f">Title berubah setelah aplikasi direstart</p>
                </div>
                <button type="button" id="btn-save-branding" class="neu-btn-primary w-full">Simpan</button>
              </div>

              <!-- Logo Aplikasi -->
              <div class="neu-inset rounded-2xl p-4 space-y-3">
                <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Logo Aplikasi</p>

                <div id="logo-preview" class="h-28 mx-auto rounded-2xl neu-pressed flex items-center justify-center overflow-hidden text-3xl">☕</div>

                <input id="logo-file" type="file" accept="image/png,image/jpg,image/jpeg,image/gif,image/webp" class="hidden" />
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" id="btn-pick-logo" class="neu-btn w-full">Pilih</button>
                  <button type="button" id="btn-save-logo" class="neu-btn-primary w-full">Simpan</button>
                </div>
              </div>

              <!-- Ikon Desktop -->
              <div class="neu-inset rounded-2xl p-4 space-y-3">
                <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Ikon Desktop</p>

                <div id="icon-preview" class="h-28 mx-auto rounded-2xl neu-pressed flex items-center justify-center overflow-hidden text-3xl">🖼️</div>

                <input id="icon-file" type="file" accept="image/*" class="hidden" />
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" id="btn-pick-icon" class="neu-btn w-full">Pilih</button>
                  <button type="button" id="btn-save-icon" class="neu-btn-primary w-full">Simpan</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      `;

      this.bind();
      this.fill();
    },

    async onShow() {
      this.fill();
    },

    async fill() {
      const s = State.settings || (await API.getSettings());
      State.settings = s;
      Helpers.$("#s-name").value = s.store_name || "";
      Helpers.$("#s-address").value = s.store_address || "";
      Helpers.$("#s-phone").value = s.store_phone || "";
      Helpers.$("#s-footer").value = s.footer_note || "";
      Helpers.$("#s-thanks").value = s.thank_you || "";
      this.qrMode(s.qr_mode || "wa");
      Helpers.$("#s-custom-url").value = s.custom_url || "";
      this.autoGenerateQrPreview();

      // paper width setting
      const pw = String(s.paper_width || "58");
      if (pw === "58" || pw === "80") {
        const radio = Helpers.$(`.paper-w-radio[value="${pw}"]`);
        if (radio) radio.checked = true;
        const customInput = Helpers.$("#s-paper-custom");
        if (customInput) customInput.value = "";
      } else {
        const customRadio = Helpers.$('.paper-w-radio[value="custom"]');
        if (customRadio) customRadio.checked = true;
        const customInput = Helpers.$("#s-paper-custom");
        if (customInput) customInput.value = pw;
      }

      // app branding fields
      Helpers.$("#s-app-name").value = s.app_name || "";
      Helpers.$("#s-app-title").value = s.app_title || "";

      // logo preview (supports data: URLs from browser mode)
      const logoPreview = Helpers.$("#logo-preview");
      if (s.app_logo) {
        logoPreview.innerHTML = `<img src="${s.app_logo}" class="w-full h-full object-contain rounded-2xl"/>`;
      } else {
        logoPreview.innerHTML = `☕`;
      }

      // icon preview
      const iconPreview = Helpers.$("#icon-preview");
      if (s.app_icon) {
        iconPreview.innerHTML = `<img src="${s.app_icon}" class="w-full h-full object-contain rounded-2xl"/>`;
      } else {
        iconPreview.innerHTML = `🖼️`;
      }
    },

    bind() {
      Helpers.$("#set-form").addEventListener("submit", (e) => { e.preventDefault(); this.save(); });
      Helpers.$("#qr-mode-wa").addEventListener("click", () => this.qrMode("wa"));
      Helpers.$("#qr-mode-custom").addEventListener("click", () => this.qrMode("custom"));

      // WA number: filter non-digits, show warning, auto-preview
      Helpers.$("#s-wa-number").addEventListener("input", () => {
        const el = Helpers.$("#s-wa-number");
        const warn = Helpers.$("#s-wa-number-warn");
        const raw = el.value;
        const digits = raw.replace(/\D/g, "");
        if (raw !== digits) {
          el.value = digits;
          warn.classList.remove("hidden");
        } else {
          warn.classList.add("hidden");
        }
        this.autoGenerateQrPreview();
      });

      // WA message + Custom URL: auto-preview on input
      Helpers.$("#s-wa-message").addEventListener("input", () => this.autoGenerateQrPreview());
      Helpers.$("#s-custom-url").addEventListener("input", () => this.autoGenerateQrPreview());

      // --- Printer: tes cetak via browser print dialog ---
      Helpers.$("#btn-cetak-tes").addEventListener("click", () => this.cetakTes());


      // --- App branding: Name & Title ---
      Helpers.$("#btn-save-branding").addEventListener("click", () => this.saveBranding());

      // --- App branding: Logo ---
      Helpers.$("#btn-pick-logo").addEventListener("click", () => Helpers.$("#logo-file").click());
      Helpers.$("#logo-file").addEventListener("change", () => {
        const file = Helpers.$("#logo-file").files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          Helpers.$("#logo-preview").innerHTML = `<img src="${e.target.result}" class="w-full h-full object-contain rounded-2xl"/>`;
          this._pendingLogoFile = file;
        };
        reader.readAsDataURL(file);
      });
      Helpers.$("#btn-save-logo").addEventListener("click", () => this.saveLogo());
      // --- App branding: Icon ---
      Helpers.$("#btn-pick-icon").addEventListener("click", () => Helpers.$("#icon-file").click());
      Helpers.$("#icon-file").addEventListener("change", () => {
        const file = Helpers.$("#icon-file").files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          Helpers.$("#icon-preview").innerHTML = `<img src="${e.target.result}" class="w-full h-full object-contain rounded-2xl"/>`;
          this._pendingIconFile = file;
        };
        reader.readAsDataURL(file);
      });
      Helpers.$("#btn-save-icon").addEventListener("click", () => this.saveIcon());
    },

    qrMode(mode) {
      this._qrMode = mode;
      Helpers.$("#qr-mode-wa").classList.toggle("is-active", mode === "wa");
      Helpers.$("#qr-mode-custom").classList.toggle("is-active", mode === "custom");
      Helpers.$("#qr-wa-fields").classList.toggle("hidden", mode !== "wa");
      Helpers.$("#qr-custom-fields").classList.toggle("hidden", mode !== "custom");
      this.autoGenerateQrPreview();
    },

    /* ------ Printer: test print via browser print dialog ------ */
    async cetakTes() {
      const s = State.settings || {};
      const pw = Number(s.paper_width) || 58;
      const chars = Number(s.paper_chars) || Math.round(pw * 0.55);
      const W = chars;
      const center = (str) => {
        const t = String(str || "");
        const pad = Math.max(0, Math.floor((W - t.length) / 2));
        return " ".repeat(pad) + t;
      };
      let body = "";
      body += center(s.store_name || "TEST PRINT") + "\n";
      body += center(s.store_address || "") + "\n";
      body += "=".repeat(W) + "\n";
      body += center("TES CETAK STRUK") + "\n";
      body += "=".repeat(W) + "\n";
      body += center(s.thank_you || "Printer siap digunakan") + "\n";

      try {
        const printArea = Helpers.$("#print-area");
        printArea.innerHTML = `<div class="receipt" style="width:${pw}mm;font-size:${pw <= 58 ? 11 : 13}px">${body}</div>`;
        printArea.style.width = pw + "mm";
        await new Promise((r) => setTimeout(r, 100));
        window.print();
        setTimeout(() => { printArea.innerHTML = ""; }, 500);
      } catch (e) {
        Notify.error("Tes Cetak Gagal", e.message);
      }
    },

    generateQrPreview(url) {
      const box = Helpers.$("#qr-live");
      if (url) {
        box.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" class="w-full h-full object-contain p-1" onerror="this.parentNode.innerHTML='<span class=&quot;text-slate-400 text-xs&quot;>QR saat cetak</span>'"/>`;
      } else {
        box.innerHTML = `<span class="text-slate-400 text-xs text-center px-2 leading-relaxed">QR Code belum dibuat</span>`;
      }
    },

    autoGenerateQrPreview() {
      if (this._qrMode === "custom") {
        const url = Helpers.$("#s-custom-url").value.trim();
        url ? this.generateQrPreview(url) : this.generateQrPreview();
        return;
      }
      // WA mode: cleanup number + build wa.me URL
      const raw = Helpers.$("#s-wa-number").value.trim();
      const message = Helpers.$("#s-wa-message").value.trim();
      if (!raw) {
        this.generateQrPreview();
        return;
      }
      let digits = raw.replace(/\D/g, "");
      if (digits.startsWith("0")) {
        digits = "62" + digits.slice(1);
      } else if (digits.startsWith("62")) {
        // use as-is
      } else if (digits.startsWith("8")) {
        digits = "62" + digits;
      }
      let url = `https://wa.me/${digits}`;
      if (message) {
        url += `?text=${encodeURIComponent(message)}`;
      }
      this.generateQrPreview(url);
    },

    async save() {
      const data = {
        store_name: Helpers.$("#s-name").value.trim(),
        store_address: Helpers.$("#s-address").value.trim(),
        store_phone: Helpers.$("#s-phone").value.trim(),
        invoice_prefix: "SC",
        footer_note: Helpers.$("#s-footer").value.trim(),
        thank_you: Helpers.$("#s-thanks").value.trim(),
        qr_mode: this._qrMode || "wa",
        wa_number: Helpers.$("#s-wa-number").value.trim(),
        wa_message: Helpers.$("#s-wa-message").value.trim(),
        custom_url: Helpers.$("#s-custom-url").value.trim(),
      };
      try {
        if (this._qrMode === "custom") {
          if (data.custom_url) data.qr_url = data.custom_url;
        } else {
          let digits = data.wa_number.replace(/\D/g, "");
          if (digits.startsWith("0")) {
            digits = "62" + digits.slice(1);
          } else if (digits.startsWith("8")) {
            digits = "62" + digits;
          }
          data.wa_number = digits;
          if (data.wa_number) {
            data.qr_url = `https://wa.me/${data.wa_number}` + (data.wa_message ? `?text=${encodeURIComponent(data.wa_message)}` : "");
          }
        }

        // --- paper width: resolve selected option + compute chars/line ---
        const selRadio = Helpers.$('.paper-w-radio:checked');
        let pwMm = "58";
        if (selRadio) {
          if (selRadio.value === "custom") {
            const cv = parseInt(Helpers.$("#s-paper-custom").value, 10);
            pwMm = (isNaN(cv) || cv < 30 || cv > 120) ? "58" : String(cv);
          } else {
            pwMm = selRadio.value;
          }
        }
        data.paper_width = pwMm;
        // chars per line ≈ mm × 0.55 (58mm≈32, 80mm≈44)
        data.paper_chars = String(Math.round(Number(pwMm) * 0.55));

        await API.updateSettings(data);
        await State.loadSettings();
        Swal.fire({
          customClass: { popup: "neu-popup" },
          buttonsStyling: false,
          icon: "success",
          title: "Pengaturan Berhasil Disimpan!",
          showConfirmButton: false,
        });
        setTimeout(() => Swal.close(), 1500);
      } catch (e) {
        if (/unauthorized|akses/i.test(e.message)) Notify.accessDenied();
        else Notify.error("Gagal menyimpan", e.message);
      }
    },

    /* ------ App branding: Name & Title ------ */
    async saveBranding() {
      const appName = Helpers.$("#s-app-name").value.trim() || "Mokundo";
      const appTitle = Helpers.$("#s-app-title").value.trim() || (appName + " Kasir");
      const warnEl = Helpers.$("#s-title-warn");
      try {
        await API.updateSettings({ app_name: appName, app_title: appTitle });
        try {
          await API.updateWindowTitle(appTitle);
        } catch (e) {
          console.error("Failed to update window title dynamically", e);
        }
        if (warnEl) warnEl.classList.remove("hidden");
        
        await State.loadSettings();
        App.applyAppBranding();
      } catch (e) {
        if (/unauthorized|akses/i.test(e.message)) Notify.accessDenied();
        else Notify.error("Gagal menyimpan", e.message);
      }
    },

    /* ------ App branding: Logo ------ */
    async saveLogo() {
      const file = this._pendingLogoFile;
      if (!file) {
        Notify.warning("Pilih gambar terlebih dahulu.");
        return;
      }
      try {
        const b64 = await Helpers.fileToBase64(file);
        const res = await API.uploadAppLogo(file.name, b64);
        await API.updateSettings({ app_logo: res.url });
        await State.loadSettings();
        App.applyAppBranding();
        this._pendingLogoFile = null;
      } catch (e) {
        if (/unauthorized|akses/i.test(e.message)) Notify.accessDenied();
        else Notify.error("Gagal menyimpan", e.message);
      }
    },

    /* ------ App branding: Icon ------ */
    async saveIcon() {
      const file = this._pendingIconFile;
      if (!file) {
        Notify.warning("Pilih gambar terlebih dahulu.");
        return;
      }
      try {
        const b64 = await Helpers.fileToBase64(file);
        const res = await API.uploadAppIcon(file.name, b64);
        await API.updateSettings({ app_icon: res.url });
        await State.loadSettings();
        this._pendingIconFile = null;
      } catch (e) {
        this._pendingIconFile = null;
        if (/unauthorized|akses/i.test(e.message)) Notify.accessDenied();
        else Notify.error("Gagal menyimpan", e.message);
      }
    },
  };

  global.SettingsView = SettingsView;
})(window);
