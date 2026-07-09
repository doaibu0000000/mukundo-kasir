/* ==========================================================================
   views/products.js — product CRUD with 3 glass-size variants + image upload
   ========================================================================== */
(function (global) {
  "use strict";

  const ProductsView = {
    all: [],
    categories: [],

    async render() {
      const root = Helpers.$("#view-products");
      root.innerHTML = `
        <div class="flex flex-col md:flex-row gap-4 mb-6">
          <div class="flex-1"><input id="prod-search" class="neu-input" placeholder="Cari produk / barcode…" /></div>
          <div class="md:w-60"><select id="prod-cat" class="neu-select"><option value="0">Semua Kategori</option></select></div>
          <button id="prod-add" class="neu-btn-primary">+ Tambah Produk</button>
        </div>
        <div id="prod-grid" class="product-grid-admin"></div>
      `;

      Helpers.$("#prod-add").addEventListener("click", () => this.openForm());
      Helpers.$("#prod-search").addEventListener(
        "input",
        Helpers.debounce(() => this.applyFilter(), 250)
      );
      Helpers.$("#prod-cat").addEventListener("change", () => this.applyFilter());

      this.loadData();
    },

    async onShow() {
      this.loadData();
    },

    async loadData() {
      try {
        const [prods, cats] = await Promise.all([
          API.listProducts(false),
          API.listCategories(),
        ]);
        this.all = prods;
        this.categories = cats;
        this.fillCategorySelect();
        this.applyFilter();
      } catch (e) {
        // silent
      }
    },

    fillCategorySelect() {
      const sel = Helpers.$("#prod-cat");
      sel.innerHTML =
        `<option value="0">Semua Kategori</option>` +
        this.categories.map((c) => `<option value="${c.id}">${Helpers.escape(c.name)}</option>`).join("");
    },

    applyFilter() {
      const kw = Helpers.$("#prod-search").value.trim().toLowerCase();
      const cat = Number(Helpers.$("#prod-cat").value || 0);
      let rows = this.all;
      if (kw) rows = rows.filter((p) => (p.name || "").toLowerCase().includes(kw) || (p.barcode || "").toLowerCase().includes(kw));
      if (cat) rows = rows.filter((p) => Number(p.category_id) === cat);
      this.renderGrid(rows);
    },

    renderGrid(rows) {
      rows = rows || this.all;
      const host = Helpers.$("#prod-grid");
      if (!rows.length) {
        host.innerHTML = `<div class="col-span-full neu-card rounded-3xl p-10 text-center text-slate-400">Belum ada produk.</div>`;
        return;
      }
      host.innerHTML = rows.map((p) => this.cardHtml(p)).join("");
      Helpers.$$(".product-card-edit").forEach((b) =>
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openForm(Number(b.dataset.id));
        })
      );
      Helpers.$$(".product-card-del").forEach((b) =>
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          this.confirmDelete(Number(b.dataset.id));
        })
      );
    },

    cardHtml(p) {
      const sizes = [];
      if (p.harga_normal != null) sizes.push(`N ${Helpers.rp(p.harga_normal)}`);
      if (p.harga_medium != null) sizes.push(`M ${Helpers.rp(p.harga_medium)}`);
      if (p.harga_max != null) sizes.push(`X ${Helpers.rp(p.harga_max)}`);
      // total stock = sum of per-variant stock (fallback to legacy stock)
      const totalStock = Number(p.stock_normal || 0) + Number(p.stock_medium || 0) + Number(p.stock_max || 0) || Number(p.stock || 0);
      const img = p.image_url
        ? `<img src="${p.image_url}" class="w-full h-full object-cover" />`
        : `<span class="text-3xl">☕</span>`;
      const active = Number(p.is_active) === 1;
      return `
        <div class="neu-card rounded-3xl overflow-hidden ${active ? "" : "opacity-60"}">
          <div class="aspect-square bg-neu-base neu-inset-sm m-3 rounded-2xl flex items-center justify-center overflow-hidden">${img}</div>
          <div class="px-4 pb-4">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold text-slate-700 line-clamp-2 leading-snug min-h-[2.6em]">${Helpers.escape(p.name)}</p>
                <p class="text-xs text-slate-400">${Helpers.escape(p.category_name || "—")}</p>
              </div>
              ${active ? "" : `<span class="neu-badge text-slate-400">Nonaktif</span>`}
            </div>
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${sizes.map((s) => `<span class="neu-badge text-slate-500">${s}</span>`).join("") || `<span class="neu-badge text-slate-400">Tanpa harga</span>`}
            </div>
            <div class="flex items-center justify-between mt-3">
              <span class="neu-badge ${totalStock <= 5 ? "text-neu-danger" : "text-slate-500"}">Stok: ${totalStock}</span>
              <div class="flex gap-2">
                <button class="neu-icon-btn product-card-edit" data-id="${p.id}" title="Edit">✏️</button>
                <button class="neu-icon-btn product-card-del" data-id="${p.id}" title="Hapus">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    /* ---------------------------------------------------------- form ------ */
    openForm(id = null) {
      const p = id ? this.all.find((x) => Number(x.id) === Number(id)) : null;
      const catOpts =
        `<option value="">— Pilih kategori —</option>` +
        this.categories.map((c) => `<option value="${c.id}" ${p && Number(p.category_id) === Number(c.id) ? "selected" : ""}>${Helpers.escape(c.name)}</option>`).join("");

      const html = `
        <div class="text-left space-y-4">
          <div class="flex gap-4 items-start">
            <div id="prod-img-preview" class="w-24 h-24 rounded-2xl neu-inset flex items-center justify-center text-3xl shrink-0 overflow-hidden">
              ${p && p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover"/>` : "📷"}
            </div>
            <div class="flex-1 space-y-2">
              <input type="hidden" id="f-image-path" value="${p ? Helpers.escape(p.image_path || "") : ""}" />
              <input id="f-image-file" type="file" accept="image/*" class="hidden" />
              <button id="f-pick-img" class="neu-btn w-full">Pilih Gambar</button>
              <p class="text-xs text-slate-400">Kosongkan jika tidak ingin mengunggah gambar.</p>
            </div>
          </div>

          <div>
              <label class="block text-xs text-slate-400 mb-1 ml-1">NAMA PRODUK *</label>
              <input id="f-name" class="neu-input" maxlength="15" value="${p ? Helpers.escape(p.name) : ""}" />
              <p id="f-name-error" class="field-error text-xs mt-1 ml-1 hidden" style="color:#ff4d4f">Nama produk wajib diisi!</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div>
              <label class="block text-xs text-slate-400 mb-1 ml-1">KATEGORI *</label>
              <select id="f-category" class="neu-select">${catOpts}</select>
              <p id="f-cat-error" class="field-error text-xs mt-1 ml-1 hidden" style="color:#ff4d4f">Silakan pilih kategori!</p>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1 ml-1">STATUS</label>
              <select id="f-active" class="neu-select">
                <option value="1" ${!p || Number(p.is_active) === 1 ? "selected" : ""}>Aktif</option>
                <option value="0" ${p && Number(p.is_active) === 0 ? "selected" : ""}>Nonaktif</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1 ml-1">BARCODE</label>
              <div class="flex gap-2">
                <input id="f-barcode" class="neu-input flex-1 min-w-0" maxlength="6" value="${p ? Helpers.escape(p.barcode || "") : ""}" />
                <button id="f-barcode-random" class="neu-btn shrink-0" type="button" style="padding:0.6rem 1rem;white-space:nowrap">🎲 Acak</button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs text-slate-400 mb-1 ml-1">DESKRIPSI</label>
            <textarea id="f-desc" rows="2" class="neu-textarea">${p ? Helpers.escape(p.description || "") : ""}</textarea>
          </div>

          <p id="f-stock-error" class="field-error text-xs mt-1 ml-1 hidden" style="color:#ff4d4f">Stok wajib diisi!</p>
          <p id="f-variant-error" class="field-error text-xs mt-1 ml-1 hidden" style="color:#ff4d4f">Minimal satu varian harga wajib diisi!</p>

          <div id="f-variants" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div id="fp-1" class="space-y-2">
              <div>
                <label id="fp-1-beli-label" class="block text-xs text-slate-400 mb-1 ml-1">HARGA BELI (MODAL) *</label>
                <input id="f-beli-1" type="number" min="0" class="neu-input" value="${p ? p.harga_beli : ""}" placeholder="0" />
              </div>
              <div>
                <label id="fp-1-label" class="block text-xs text-slate-400 mb-1 ml-1">HARGA NORMAL</label>
                <input id="f-normal" type="number" min="0" class="neu-input" value="${p && p.harga_normal != null ? p.harga_normal : ""}" placeholder="-" />
              </div>
              <div>
                <label id="fs-1-label" class="block text-xs text-slate-400 mb-1 ml-1">STOK *</label>
                <input id="f-stock-1" type="number" min="0" class="neu-input" value="${p ? (p.stock_normal ?? "") : ""}" placeholder="0" />
              </div>
            </div>
            <div id="fp-2" class="space-y-2">
              <div>
                <label id="fp-2-beli-label" class="block text-xs text-slate-400 mb-1 ml-1">HARGA BELI (MODAL) *</label>
                <input id="f-beli-2" type="number" min="0" class="neu-input" value="${p ? p.harga_beli : ""}" placeholder="0" />
              </div>
              <div>
                <label id="fp-2-label" class="block text-xs text-slate-400 mb-1 ml-1">HARGA MEDIUM</label>
                <input id="f-medium" type="number" min="0" class="neu-input" value="${p && p.harga_medium != null ? p.harga_medium : ""}" placeholder="-" />
              </div>
              <div>
                <label id="fs-2-label" class="block text-xs text-slate-400 mb-1 ml-1">STOK *</label>
                <input id="f-stock-2" type="number" min="0" class="neu-input" value="${p ? (p.stock_medium ?? "") : ""}" placeholder="0" />
              </div>
            </div>
            <div id="fp-3" class="space-y-2">
              <div>
                <label id="fp-3-beli-label" class="block text-xs text-slate-400 mb-1 ml-1">HARGA BELI (MODAL) *</label>
                <input id="f-beli-3" type="number" min="0" class="neu-input" value="${p ? p.harga_beli : ""}" placeholder="0" />
              </div>
              <div>
                <label id="fp-3-label" class="block text-xs text-slate-400 mb-1 ml-1">HARGA MAX</label>
                <input id="f-max" type="number" min="0" class="neu-input" value="${p && p.harga_max != null ? p.harga_max : ""}" placeholder="-" />
              </div>
              <div>
                <label id="fs-3-label" class="block text-xs text-slate-400 mb-1 ml-1">STOK *</label>
                <input id="f-stock-3" type="number" min="0" class="neu-input" value="${p ? (p.stock_max ?? "") : ""}" placeholder="0" />
              </div>
            </div>
          </div>
          <p id="fp-hint" class="text-xs text-slate-400">* Kosongkan ukuran yang tidak tersedia.</p>
        </div>
      `;

      // hold the selected file until preConfirm runs
      let pendingFile = null;
      global.__modalPreConfirm = async () => {
        // reset all inline errors
        Helpers.$$(".field-error").forEach((el) => el.classList.add("hidden"));
        Helpers.$("#f-category").classList.remove("neu-select-error");

        const showError = (id, msg) => {
          const el = Helpers.$(id);
          if (el) { el.textContent = msg; el.classList.remove("hidden"); }
        };
        const nameVal = Helpers.$("#f-name").value.trim();
        const catId = Helpers.$("#f-category").value;
        const readNum = (id) => { const v = Helpers.$(id).value; return v === "" ? null : Number(v); };
        const readNumOrZero = (id) => { const v = Helpers.$(id).value; return v === "" ? 0 : Number(v); };

        /* read harga beli & stok per visible column */
        const beli1 = readNum("#f-beli-1");
        const beli2 = readNum("#f-beli-2");
        const beli3 = readNum("#f-beli-3");
        const stock1 = readNum("#f-stock-1");
        const stock2 = readNum("#f-stock-2");
        const stock3 = readNum("#f-stock-3");

        if (!nameVal) { showError("#f-name-error", "Nama produk wajib diisi!"); throw new Error("Lengkapi field wajib!"); }
        if (!catId) {
          Helpers.$("#f-category").classList.add("neu-select-error");
          showError("#f-cat-error", "Silakan pilih kategori!");
          throw new Error("Lengkapi field wajib!");
        }

        const cat = this.categories.find((c) => String(c.id) === catId);
        const catName = cat ? cat.name : "";

        let harga_normal, harga_medium, harga_max;
        let beliVal;
        let stockNormal, stockMedium, stockMax;

        if (catName === "Minuman") {
          harga_normal = readNum("#f-normal");
          harga_medium = readNum("#f-medium");
          harga_max = readNum("#f-max");
          beliVal = beli1;
          stockNormal = stock1;
          stockMedium = stock2;
          stockMax = stock3;
        } else if (catName === "Makanan") {
          harga_normal = readNum("#f-normal");
          harga_medium = null;
          harga_max = readNum("#f-max");
          beliVal = beli1;
          stockNormal = stock1;
          stockMedium = null;
          stockMax = stock3;
        } else {
          harga_normal = readNum("#f-normal");
          harga_medium = null;
          harga_max = null;
          beliVal = beli1;
          stockNormal = stock1;
          stockMedium = null;
          stockMax = null;
        }

        if (beliVal === null || beliVal < 0) { showError("#f-stock-error", "Harga beli wajib diisi!"); throw new Error("Lengkapi field wajib!"); }
        // validate stock for every available size — each must be >= 0
        const stockEntries = [
          ["Normal", stockNormal],
          ["Medium", stockMedium],
          ["Max", stockMax],
        ].filter(([, v]) => v !== null && v !== undefined);
        for (const [label, v] of stockEntries) {
          if (v < 0) {
            showError("#f-stock-error", `Stok ${label} tidak boleh negatif!`);
            throw new Error("Lengkapi field wajib!");
          }
        }
        // require at least one stock value for the first/normal variant
        if (stockNormal === null || stockNormal < 0) {
          showError("#f-stock-error", "Stok wajib diisi!");
          throw new Error("Lengkapi field wajib!");
        }

        if ([harga_normal, harga_medium, harga_max].every((v) => v === null)) {
          showError("#f-variant-error", "Minimal satu varian harga wajib diisi!");
          throw new Error("Lengkapi field wajib!");
        }

        const data = {
          name: nameVal,
          category_id: catId || null,
          barcode: Helpers.$("#f-barcode").value.trim(),
          description: Helpers.$("#f-desc").value.trim(),
          harga_beli: Number(beliVal),
          harga_normal,
          harga_medium,
          harga_max,
          // per-variant stock (independent columns in the DB)
          stock_normal: stockNormal != null ? Number(stockNormal) : 0,
          stock_medium: stockMedium != null ? Number(stockMedium) : 0,
          stock_max: stockMax != null ? Number(stockMax) : 0,
          // legacy aggregate stock = sum of variant stocks
          stock: Number(stockNormal != null ? stockNormal : 0)
               + Number(stockMedium != null ? stockMedium : 0)
               + Number(stockMax != null ? stockMax : 0),
          is_active: Number(Helpers.$("#f-active").value),
          image_path: Helpers.$("#f-image-path").value,
        };

        try {
          let savedId = id;
          if (id) await API.updateProduct(id, data);
          else savedId = (await API.createProduct(data)).id;

          if (pendingFile) {
            const b64 = await Helpers.fileToBase64(pendingFile);
            const url = await API.uploadProductImage(savedId, pendingFile.name, b64);
            data.image_path = url;
          }
          return true;
        } catch (e) {
          throw new Error(e.message || "Gagal menyimpan");
        }
      };

      Notify.modal({
        title: id ? "Edit Produk" : "Tambah Produk",
        html,
        confirmText: "Simpan",
        width: "640px",
      }).then(async (res) => {
        global.__modalPreConfirm = null;
        if (res.isConfirmed) {
          await this.refresh();
        }
        /* Batal (cancel / dismiss) — cleanup all residual state & errors.
           SweetAlert2 destroys the modal DOM on close, so field values are
           already gone. We only need to clear any leftover validation state
           and the pending file reference. */
        pendingFile = null;
        if (typeof Swal !== "undefined") {
          Swal.resetValidationMessage();
        }
      });

      // wire image picker & barcode randomiser (after DOM is in the modal)
      setTimeout(() => {
        const pick = Helpers.$("#f-pick-img");
        const file = Helpers.$("#f-image-file");
        if (!pick || !file) return;
        pick.addEventListener("click", () => file.click());
        file.addEventListener("change", () => {
          const rawFile = file.files[0];
          if (!rawFile) return;
          // Open cropper modal instead of directly showing preview
          openCropperModal(rawFile).then((croppedFile) => {
            if (croppedFile) {
              pendingFile = croppedFile;
              const reader = new FileReader();
              reader.onload = (e) => {
                Helpers.$("#prod-img-preview").innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover"/>`;
              };
              reader.readAsDataURL(croppedFile);
            }
          });
        });

        const randBtn = Helpers.$("#f-barcode-random");
        const barcodeInput = Helpers.$("#f-barcode");
        if (randBtn && barcodeInput) {
          randBtn.addEventListener("click", () => {
            barcodeInput.value = String(100000 + Math.floor(Math.random() * 900000));
          });
        }

        // clear inline errors & unstick Swal confirm button on user interaction
        const unstick = () => {
          const btn = document.querySelector(".swal2-confirm");
          if (btn) { btn.disabled = false; btn.classList.remove("swal2-loading"); }
          if (typeof Swal !== "undefined") Swal.resetValidationMessage();
        };
        const clearErr = (id) => { const el = Helpers.$(id); if (el) el.classList.add("hidden"); };
        Helpers.$("#f-name").addEventListener("input", () => {
          const el = Helpers.$("#f-name-error");
          if (el) {
            if (Helpers.$("#f-name").value.length >= 15) {
              el.textContent = "Maksimal 15 karakter!";
              el.classList.remove("hidden");
            } else {
              el.classList.add("hidden");
            }
          }
          unstick();
        });
        Helpers.$("#f-category").addEventListener("change", () => { clearErr("#f-cat-error"); Helpers.$("#f-category").classList.remove("neu-select-error"); unstick(); });
        Helpers.$("#f-normal").addEventListener("input", () => { clearErr("#f-variant-error"); unstick(); });
        Helpers.$("#f-medium").addEventListener("input", () => { clearErr("#f-variant-error"); unstick(); });
        Helpers.$("#f-max").addEventListener("input", () => { clearErr("#f-variant-error"); unstick(); });

        const catSelect = Helpers.$("#f-category");
        const categoryHintMap = {
          "Minuman": "* Kosongkan ukuran yang tidak dijual (botol, gelas, atau cup)",
          "Makanan": "* Kosongkan ukuran yang tidak dijual (porsi sedang, atau besar)",
          "Snack": "* Kosongkan ukuran yang tidak dijual (sachet, kemasan kecil, atau besar)",
          "Kopi": "* Kosongkan ukuran yang tidak dijual (small, medium, atau large)",
          "Es Krim": "* Kosongkan ukuran yang tidak dijual (cup, cone, atau pint)",
          "Roti / Bakery": "* Kosongkan ukuran yang tidak dijual (slice, loaf, atau dus)",
          "Buah": "* Kosongkan ukuran yang tidak dijual (per buah, per kg, atau per pack)",
        };
        const updateVariants = () => {
          const cid = catSelect.value;
          const c = this.categories.find((x) => String(x.id) === cid);
          const cn = c ? c.name : "";
          const fp1 = Helpers.$("#fp-1");
          const fp2 = Helpers.$("#fp-2");
          const fp3 = Helpers.$("#fp-3");
          const l1 = Helpers.$("#fp-1-label");
          const l3 = Helpers.$("#fp-3-label");
          const hint = Helpers.$("#fp-hint");

          if (cn === "Minuman") {
            fp1.style.display = ""; fp2.style.display = ""; fp3.style.display = "";
            l1.textContent = "HARGA NORMAL"; l3.textContent = "HARGA MAX";
          } else if (cn === "Makanan") {
            fp1.style.display = ""; fp2.style.display = "none"; fp3.style.display = "";
            l1.textContent = "HARGA BIASA"; l3.textContent = "HARGA JUMBO";
          } else {
            fp1.style.display = ""; fp2.style.display = "none"; fp3.style.display = "none";
            l1.textContent = "HARGA NORMAL";
          }
          if (hint) hint.textContent = categoryHintMap[cn] || "* Kosongkan ukuran yang tidak tersedia.";
        };
        catSelect.addEventListener("change", () => { updateVariants(); clearErr("#f-variant-error"); });
        updateVariants();
      }, 50);
    },

    async refresh() {
      this.all = await API.listProducts(false);
      this.applyFilter();
    },

    async confirmDelete(id) {
      const p = this.all.find((x) => Number(x.id) === Number(id));
      const ok = await Notify.confirm(`Hapus produk "${p ? p.name : id}"?`, "Tindakan ini tidak dapat dibatalkan.");
      if (!ok) return;
      try {
        await API.deleteProduct(id);
        await this.refresh();
      } catch (e) {
        Notify.error("Gagal menghapus", e.message);
      }
    },
  };

  /* --------------------------------------------------------------- */
  /* Image Cropper Modal — locked 1:1 aspect ratio                   */
  /* Uses a custom HTML overlay (NOT Swal.fire) so the parent Sweet  */
  /* Alert2 "Tambah Produk" modal stays alive underneath.            */
  /* Returns a Promise<File | null> with the cropped image as a      */
  /* JPEG File object.                                                */
  /* --------------------------------------------------------------- */
  function openCropperModal(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;

        // Build the overlay element
        const overlay = document.createElement("div");
        overlay.id = "cropper-overlay";
        overlay.style.cssText = "position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);";

        overlay.innerHTML = `
          <div class="swal2-popup neu-popup" style="padding:1.8rem 2rem;width:440px;max-width:95vw;max-height:90vh;overflow:hidden;">
            <h2 class="swal2-title" style="font-size:1.15rem;margin-bottom:1rem;">Potong Gambar</h2>
            <div style="max-height:55vh;overflow:hidden;border-radius:var(--radius-sm);margin-bottom:0.75rem;">
              <img id="cropper-image" src="${dataUrl}" style="display:block;width:100%;" />
            </div>
            <p style="font-size:0.7rem;color:var(--text-faint);text-align:center;margin-bottom:1rem;">Geser atau zoom untuk memilih area gambar yang diinginkan.</p>
            <div style="display:flex;gap:0.65rem;justify-content:flex-end;">
              <button id="cropper-cancel" class="neu-btn" style="font-size:0.85rem;">Batal</button>
              <button id="cropper-confirm" class="neu-btn-primary" style="font-size:0.85rem;">✂️ Potong & Simpan</button>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        // Prevent clicks on backdrop from closing
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) e.stopPropagation();
        });

        // Init Cropper.js
        const img = document.getElementById("cropper-image");
        const cropper = new Cropper(img, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.8,
          responsive: true,
          background: true,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
        });

        // Cleanup helper
        const destroy = () => {
          cropper.destroy();
          overlay.remove();
        };

        // Confirm button
        document.getElementById("cropper-confirm").addEventListener("click", () => {
          const canvas = cropper.getCroppedCanvas({
            width: 512,
            height: 512,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high",
          });
          destroy();
          canvas.toBlob(
            (blob) => {
              const croppedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, "") + "_cropped.jpg",
                { type: "image/jpeg", lastModified: Date.now() }
              );
              resolve(croppedFile);
            },
            "image/jpeg",
            0.92
          );
        });

        // Cancel button
        document.getElementById("cropper-cancel").addEventListener("click", () => {
          destroy();
          resolve(null);
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  global.ProductsView = ProductsView;
})(window);
