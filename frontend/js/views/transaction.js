/* ==========================================================================
   views/transaction.js — cashier page: catalog -> variant popup -> cart -> checkout + print
   ========================================================================== */
(function (global) {
  "use strict";

  const PLATFORMS = ["Pickup", "Take Away", "GrabFood", "ShopeeFood", "GoFood"];

  const TransactionView = {
    products: [],
    cart: [],          // {product_id, name, size, price, cost, qty}
    discountType: "percent",
    discountValue: "",
    paidAmount: "",

    async render() {
      this.cart = [];
      this.discountType = "percent";
      this.discountValue = "";
      this.paidAmount = "";
      this.selectedPaymentMethod = "CASH";

      const root = Helpers.$("#view-transaction");
      root.innerHTML = `
        <div class="tx-layout">
          <!-- catalog (flexible, internal grid scrolls — search bar stays fixed) -->
          <div class="tx-catalog">
            <div class="tx-search-bar">
              <div class="neu-card rounded-3xl p-4">
                <input id="tx-search" class="neu-input" placeholder="Cari produk / barcode…" />
              </div>
            </div>
            <div class="tx-catalog-scroll">
              <div id="tx-grid" class="product-grid"></div>
            </div>
          </div>

          <!-- cart (fixed width, locked full height, only item list scrolls) -->
          <div class="tx-cart neu-card rounded-3xl p-5">
            <!-- (a) HEADER — fixed -->
            <h3 class="tx-cart-header font-semibold text-slate-700 mb-4 flex items-center justify-between">
              Keranjang <span id="tx-cart-count" class="neu-badge text-slate-500">0 item</span>
            </h3>
            <!-- (b) ITEM LIST — the only scrollable region -->
            <div id="tx-cart" class="tx-cart-list space-y-3"></div>
            <!-- (c) FOOTER — pinned to bottom, never sinks off-screen -->
            <div class="tx-cart-footer mt-4 space-y-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1 ml-1">PLATFORM *</label>
                <select id="tx-platform" class="neu-select">
                  <option value="">— Pilih platform —</option>
                  ${PLATFORMS.map((p) => `<option value="${p}">${p}</option>`).join("")}
                </select>
                <p id="tx-platform-error" class="text-xs mt-1 ml-1 hidden" style="color:#ff4d4f">Pilih platform terlebih dahulu</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 mb-1 ml-1">DISKON</label>
                  <select id="tx-disc-type" class="neu-select">
                    <option value="percent">Persen (%)</option>
                    <option value="amount">Rupiah (Rp)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-slate-400 mb-1 ml-1">NILAI</label>
                  <input id="tx-disc-value" type="number" min="0" value="" placeholder="0" class="neu-input" />
                </div>
              </div>

              <div class="neu-inset rounded-2xl p-4 space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-slate-400">Subtotal</span><span id="tx-subtotal" class="font-medium">Rp0</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Diskon</span><span id="tx-discount" class="font-medium text-neu-danger">Rp0</span></div>
                <div class="flex justify-between text-base pt-1 border-t border-white/60"><span class="font-semibold text-slate-700">Grand Total</span><span id="tx-grand" class="font-bold text-neu-accent">Rp0</span></div>
              </div>

              <!-- Pilihan Metode Pembayaran -->
              <div class="tx-payment-method-container">
                <label class="block text-xs text-slate-400 mb-1 ml-1">METODE PEMBAYARAN</label>
                <div class="payment-btn-group">
                  <button type="button" class="payment-btn is-active" data-method="CASH">Uang Cash</button>
                  <button type="button" class="payment-btn" data-method="QRIS">QRIS</button>
                  <button type="button" class="payment-btn" data-method="DANA">DANA</button>
                  <button type="button" class="payment-btn" data-method="GOPAY">GoPay</button>
                  <button type="button" class="payment-btn" data-method="OVO">OVO</button>
                  <button type="button" class="payment-btn" data-method="SHOPEEPAY">ShopeePay</button>
                  <button type="button" class="payment-btn" data-method="BANK">Bank</button>
                </div>
              </div>

              <div id="tx-cash-flow" class="space-y-3">
                <div>
                  <label class="block text-xs text-slate-400 mb-1 ml-1">TUNAI DIBAYAR</label>
                  <input id="tx-paid" type="number" min="0" value="" placeholder="0" class="neu-input" />
                  <p id="tx-paid-error" class="text-xs mt-1 ml-1 hidden" style="color:#ff4d4f">Tunai kurang</p>
                </div>
                <div class="neu-inset rounded-2xl p-3 flex justify-between text-sm">
                  <span class="text-slate-400">Kembalian</span><span id="tx-change" class="font-bold text-neu-success">Rp0</span>
                </div>
              </div>

              <button id="tx-checkout" class="neu-btn-success w-full">💳 Bayar & Cetak Struk</button>
            </div>
          </div>
        </div>
      `;

      Helpers.$("#tx-search").addEventListener("input", Helpers.debounce(() => this.applyFilter(), 200));
      Helpers.$("#tx-disc-type").addEventListener("change", (e) => { this.discountType = e.target.value; this.recalc(); });
      Helpers.$("#tx-disc-value").addEventListener("input", (e) => { this.discountValue = e.target.value; this.recalc(); });
      Helpers.$("#tx-paid").addEventListener("input", (e) => {
        this.paidAmount = e.target.value;
        this.recalc();
        this.clearPaidError();
      });
      Helpers.$("#tx-checkout").addEventListener("click", () => this.doCheckout());
      Helpers.$("#tx-platform").addEventListener("change", () => this.clearPlatformError());

      Helpers.$$(".payment-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.selectedPaymentMethod = btn.dataset.method;
          Helpers.$$(".payment-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
          
          const cashFlowEl = Helpers.$("#tx-cash-flow");
          if (this.selectedPaymentMethod === "CASH") {
            cashFlowEl.classList.remove("hidden");
            this.paidAmount = "";
            const txPaidEl = Helpers.$("#tx-paid");
            if (txPaidEl) txPaidEl.value = "";
          } else {
            cashFlowEl.classList.add("hidden");
            this.clearPaidError();
          }
          this.recalc();
        });
      });

      this.loadProducts();
    },

    async onShow() {
      this.loadProducts();
    },

    async loadProducts() {
      try {
        this.products = await API.listProducts(true);
        this.applyFilter();
      } catch (e) {
        // silent
      }
    },

    applyFilter() {
      const kw = Helpers.$("#tx-search").value.trim().toLowerCase();
      let rows = this.products;
      if (kw) rows = rows.filter((p) => (p.name || "").toLowerCase().includes(kw) || (p.barcode || "").toLowerCase().includes(kw));
      this.renderGrid(rows);
    },

    renderGrid(rows) {
      rows = rows || this.products;
      const host = Helpers.$("#tx-grid");
      if (!rows.length) {
        host.innerHTML = `<div class="col-span-full neu-card rounded-3xl p-8 text-center text-slate-400">Produk tidak ditemukan.</div>`;
        return;
      }
      host.innerHTML = rows.map((p) => {
        const img = p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover"/>` : `<span class="text-2xl">☕</span>`;
        const from = p.harga_normal ?? p.harga_medium ?? p.harga_max ?? 0;
        const sizes = [];
        if (p.harga_normal != null) sizes.push("Normal");
        if (p.harga_medium != null) sizes.push("Medium");
        if (p.harga_max != null) sizes.push("Max");
        return `
          <div class="product-card neu-card rounded-3xl p-3" data-id="${p.id}">
            <div class="aspect-square rounded-2xl neu-inset flex items-center justify-center overflow-hidden mb-2">${img}</div>
            <p class="text-sm font-medium text-slate-700 line-clamp-2 leading-snug min-h-[2.6em]">${Helpers.escape(p.name)}</p>
            <p class="text-xs text-neu-accent font-semibold mt-1">${Helpers.rp(from)}</p>
            <p class="text-[10px] text-slate-400 mt-1">${sizes.join(" · ") || "—"}</p>
          </div>`;
      }).join("");
      Helpers.$$(".product-card").forEach((c) =>
        c.addEventListener("click", () => this.openVariant(Number(c.dataset.id)))
      );
    },

    /* ------------------------------------------------ variant popup ------- */
    openVariant(productId) {
      const p = this.products.find((x) => Number(x.id) === Number(productId));
      if (!p) return;

      // Conditional UI: label & variant text based on category
      const catName = (p.category_name || "").trim();
      const isMakanan = catName === "Makanan";

      // Mapping label untuk header modal
      const sizeHeader = isMakanan ? "PILIH PORSI MAKANAN" : "PILIH UKURAN";
      // Mapping teks varian
      const sizeDisplayMap = isMakanan
        ? { "Normal": "Porsi Biasa", "Max": "Porsi Jumbo" }
        : {};

      const variants = [];
      if (p.harga_normal != null) variants.push({ size: "Normal", price: p.harga_normal, stock: Number(p.stock_normal || 0) });
      if (p.harga_medium != null) variants.push({ size: "Medium", price: p.harga_medium, stock: Number(p.stock_medium || 0) });
      if (p.harga_max != null) variants.push({ size: "Max", price: p.harga_max, stock: Number(p.stock_max || 0) });
      if (!variants.length) { Notify.warning("Tidak ada varian harga untuk produk ini."); return; }

      let chosen = { size: variants[0].size, price: variants[0].price, qty: 1 };
      const variantHtml = (sel) => variants.map((v) => {
        const displayLabel = sizeDisplayMap[v.size] || v.size;
        return `
        <button type="button" data-size="${v.size}" data-price="${v.price}"
          class="variant-pick neu-btn w-full justify-between ${sel === v.size ? "is-active" : ""}">
          <span>${displayLabel}</span><span class="font-semibold">${Helpers.rp(v.price)}</span>
        </button>`;
      }).join("");

      const chosenStock = () => {
        const found = variants.find((v) => v.size === chosen.size);
        return found ? found.stock : 0;
      };

      const html = () => `
        <div class="text-left space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl neu-inset flex items-center justify-center overflow-hidden">
              ${p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover"/>` : `<span class="text-2xl">☕</span>`}
            </div>
            <div>
              <p class="font-semibold text-slate-700">${Helpers.escape(p.name)}</p>
              <p id="variant-stock-label" class="text-xs text-slate-400">Stok: ${chosenStock()}</p>
            </div>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-2 ml-1">${sizeHeader}</p>
            <div id="variant-list" class="space-y-2">${variantHtml(chosen.size)}</div>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-2 ml-1">JUMLAH</p>
            <div class="flex items-center gap-3">
              <button id="qty-minus" class="neu-icon-btn">−</button>
              <input id="qty-input" type="number" min="1" value="${chosen.qty}" class="neu-input text-center" />
              <button id="qty-plus" class="neu-icon-btn">+</button>
            </div>
          </div>
        </div>`;

      const popup = Swal.mixin({
        customClass: { popup: "neu-popup" },
        buttonsStyling: false,
        showCancelButton: true,
        confirmButtonText: "Tambah ke Keranjang",
        cancelButtonText: "Batal",
        reverseButtons: true,
      });

      Swal.fire({
        title: "Pilih Varian",
        html: html(),
        showCancelButton: true,
        confirmButtonText: "Tambah ke Keranjang",
        cancelButtonText: "Batal",
        reverseButtons: true,
        customClass: { popup: "neu-popup", confirmButton: "neu-btn-primary", cancelButton: "neu-btn" },
        buttonsStyling: false,
        didOpen: () => {
          const modal = Swal.getPopup();
          const updateStockLabel = () => {
            const el = modal.querySelector("#variant-stock-label");
            if (el) el.textContent = `Stok: ${chosenStock()}`;
          };
          modal.querySelectorAll(".variant-pick").forEach((btn) =>
            btn.addEventListener("click", () => {
              chosen.size = btn.dataset.size;
              chosen.price = Number(btn.dataset.price);
              modal.querySelector("#variant-list").innerHTML = variantHtml(chosen.size);
              modal.querySelectorAll(".variant-pick").forEach((b2) =>
                b2.classList.toggle("is-active", b2.dataset.size === chosen.size)
              );
              modal.querySelectorAll(".variant-pick").forEach((b2) =>
                b2.addEventListener("click", () => {
                  chosen.size = b2.dataset.size; chosen.price = Number(b2.dataset.price);
                  modal.querySelectorAll(".variant-pick").forEach((b3) => b3.classList.toggle("is-active", b3.dataset.size === chosen.size));
                  updateStockLabel();
                }, { once: false })
              );
              updateStockLabel();
            })
          );
          modal.querySelector("#qty-minus").addEventListener("click", () => {
            chosen.qty = Math.max(1, Number(modal.querySelector("#qty-input").value) - 1);
            modal.querySelector("#qty-input").value = chosen.qty;
          });
          modal.querySelector("#qty-plus").addEventListener("click", () => {
            chosen.qty = Number(modal.querySelector("#qty-input").value) + 1;
            modal.querySelector("#qty-input").value = chosen.qty;
          });
          modal.querySelector("#qty-input").addEventListener("input", (e) => {
            chosen.qty = Math.max(1, Number(e.target.value || 1));
          });
        },
        preConfirm: () => chosen,
      }).then((res) => {
        if (res.isConfirmed && res.value) this.addToCart(p, res.value);
      });
    },

    addToCart(p, v) {
      const key = `${p.id}__${v.size}`;
      const existing = this.cart.find((c) => c.key === key);
      if (existing) {
        existing.qty += v.qty;
      } else {
        this.cart.push({
          key,
          product_id: p.id,
          name: p.name,
          size: v.size,
          price: Number(v.price),
          cost: Number(p.harga_beli || 0),
          qty: v.qty,
        });
      }
      this.renderCart();
    },

    renderCart() {
      const host = Helpers.$("#tx-cart");
      Helpers.$("#tx-cart-count").textContent = `${this.cart.reduce((s, c) => s + c.qty, 0)} item`;
      if (!this.cart.length) {
        host.innerHTML = `<p class="text-center text-sm text-slate-400 py-8">Keranjang kosong</p>`;
      } else {
        host.innerHTML = this.cart.map((c, i) => `
          <div class="neu-inset rounded-2xl p-3 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">${Helpers.escape(c.name)} <span class="text-xs text-slate-400">(${c.size})</span></p>
              <p class="text-xs text-slate-400">${Helpers.rp(c.price)} × ${c.qty}</p>
            </div>
            <div class="flex items-center gap-1">
              <button class="neu-icon-btn cart-minus" data-i="${i}" style="width:30px;height:30px">−</button>
              <span class="w-6 text-center text-sm font-medium">${c.qty}</span>
              <button class="neu-icon-btn cart-plus" data-i="${i}" style="width:30px;height:30px">+</button>
              <button class="neu-icon-btn cart-del" data-i="${i}" style="width:30px;height:30px">✕</button>
            </div>
          </div>`).join("");
        Helpers.$$(".cart-minus").forEach((b) => b.addEventListener("click", () => this.changeQty(Number(b.dataset.i), -1)));
        Helpers.$$(".cart-plus").forEach((b) => b.addEventListener("click", () => this.changeQty(Number(b.dataset.i), 1)));
        Helpers.$$(".cart-del").forEach((b) => b.addEventListener("click", () => this.removeFromCart(Number(b.dataset.i))));
      }
      this.recalc();
    },

    resetCart() {
      this.cart = [];
      this.discountType = "percent";
      this.discountValue = "";
      this.paidAmount = "";
      this.selectedPaymentMethod = "CASH";
      Helpers.$$(".payment-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.method === "CASH");
      });
      const cashFlowEl = Helpers.$("#tx-cash-flow");
      if (cashFlowEl) cashFlowEl.classList.remove("hidden");

      Helpers.$("#tx-cart-count").textContent = "0 item";
      Helpers.$("#tx-cart").innerHTML = `<p class="text-center text-sm text-slate-400 py-8">Keranjang kosong</p>`;
      Helpers.$("#tx-platform").value = "";
      Helpers.$("#tx-disc-type").value = "percent";
      Helpers.$("#tx-disc-value").value = "";
      Helpers.$("#tx-paid").value = "";
      this.recalc();
    },

    changeQty(i, delta) {
      this.cart[i].qty += delta;
      if (this.cart[i].qty <= 0) this.cart.splice(i, 1);
      this.renderCart();
    },
    removeFromCart(i) { this.cart.splice(i, 1); this.renderCart(); },

    recalc() {
      const subtotal = this.cart.reduce((s, c) => s + c.price * c.qty, 0);
      const dv = Number(this.discountValue || 0);
      let discount = 0;
      if (this.discountType === "percent") discount = subtotal * Math.min(100, Math.max(0, dv)) / 100;
      else discount = Math.min(subtotal, Math.max(0, dv));
      const grand = Math.max(0, subtotal - discount);

      let paid;
      if (this.selectedPaymentMethod && this.selectedPaymentMethod !== "CASH") {
        paid = grand;
        this.paidAmount = grand;
        const txPaidEl = Helpers.$("#tx-paid");
        if (txPaidEl) txPaidEl.value = grand;
      } else {
        paid = Number(this.paidAmount || 0);
      }

      const change = Math.max(0, paid - grand);
      Helpers.$("#tx-subtotal").textContent = Helpers.rp(subtotal);
      Helpers.$("#tx-discount").textContent = "− " + Helpers.rp(discount);
      Helpers.$("#tx-grand").textContent = Helpers.rp(grand);
      Helpers.$("#tx-change").textContent = Helpers.rp(change);
    },

    showPlatformError() {
      Helpers.$("#tx-platform").classList.add("neu-select-error");
      Helpers.$("#tx-platform-error").classList.remove("hidden");
    },
    clearPlatformError() {
      Helpers.$("#tx-platform").classList.remove("neu-select-error");
      Helpers.$("#tx-platform-error").classList.add("hidden");
    },
    showPaidError(grand) {
      Helpers.$("#tx-paid").classList.add("neu-input-error");
      Helpers.$("#tx-paid-error").textContent = `Tunai kurang. Butuh ${Helpers.rp(grand)}`;
      Helpers.$("#tx-paid-error").classList.remove("hidden");
    },
    clearPaidError() {
      Helpers.$("#tx-paid").classList.remove("neu-input-error");
      Helpers.$("#tx-paid-error").classList.add("hidden");
    },

    /* ------------------------------------------------------ checkout ------- */
    async doCheckout() {
      if (!this.cart.length) return Notify.warning("Keranjang masih kosong");
      const platform = Helpers.$("#tx-platform").value;
      if (!platform) { this.showPlatformError(); return; }

      const subtotal = this.cart.reduce((s, c) => s + c.price * c.qty, 0);
      const grand = Math.max(0, subtotal - this.calcDiscountPreview(subtotal));
      const paid = Number(this.paidAmount || 0);
      if (paid < grand) { this.showPaidError(grand); return; }

      const payload = {
        platform,
        items: this.cart.map((c) => ({ product_id: c.product_id, size: c.size, qty: c.qty })),
        discount_type: this.discountType,
        discount_value: Number(this.discountValue || 0),
        paid_amount: paid,
        payment_method: this.selectedPaymentMethod || "CASH",
      };

      try {
        const result = await API.checkout(payload);

        // success -> show receipt preview modal
        const receiptHTML = this.buildReceiptHTML(result);
        const print = await Swal.fire({
          title: "🧾 Struk Pembayaran",
          html: receiptHTML,
          showCancelButton: true,
          confirmButtonText: "🖨️ Cetak Struk",
          cancelButtonText: "Tutup",
          reverseButtons: true,
          buttonsStyling: false,
          customClass: {
            popup: "neu-popup",
            confirmButton: "neu-btn-success",
            cancelButton: "neu-btn",
          },
          didOpen: async () => {
            // render QR code inside the preview if URL mode
            const s = State.settings || {};
            if (s.qr_url) {
              try {
                await this.injectPreviewQR(s.qr_url);
              } catch (_) { /* qrcode lib optional */ }
            }
          },
        });

        if (print.isConfirmed) {
          await API.confirmCheckout(result.order_id);
          await this.printReceipt(result);
          this.resetCart();
        } else {
          API.cancelCheckout(result.order_id).catch(() => {});
        }
      } catch (e) {
        Notify.error("Checkout Gagal", e.message);
      }
    },

    calcDiscountPreview(subtotal) {
      const dv = Number(this.discountValue || 0);
      if (this.discountType === "percent") return subtotal * Math.min(100, Math.max(0, dv)) / 100;
      return Math.min(subtotal, Math.max(0, dv));
    },

    /* -------------------------------------------------------- receipt ------ */
    /* Collect all transaction data into the dict Python expects, then hand
       it to the backend which renders + prints it via Win32 (NO window.print,
       NO OS dialog). The preview modal stays an on-screen preview only. */
    buildReceiptData(tx) {
      const s = State.settings || {};
      return {
        printer_name: s.printer_name || "",
        paper_width_mm: Number(s.paper_width) || 58,
        paper_chars: String(s.paper_chars || ""),
        store: {
          name: s.store_name || "SURANTAKA COFFEE",
          address: s.store_address || "",
          phone: s.store_phone || "",
          promo_text: s.footer_note || "",
          thank_you: s.thank_you || "",
          qr_url: s.qr_url || "",
        },
        order_id: tx.order_id || "",
        date: Helpers.formatDateTime(tx.order_date),
        cashier: tx.cashier || "-",
        platform: tx.platform || "",
        items: (tx.details || []).map((d) => ({
          name: d.product_name,
          variant: d.size || "",
          qty: Number(d.qty) || 1,
          price: Number(d.price) || 0,
          subtotal: Number(d.subtotal) || 0,
        })),
        subtotal: Number(tx.subtotal) || 0,
        discount_percent: tx.discount_type === "percent" ? tx.discount_value : 0,
        discount_value: Number(tx.discount_value) || 0,
        discount_amount: Number(tx.discount_amount) || 0,
        grand_total: Number(tx.grand_total) || 0,
        payment_method: tx.payment_method || "CASH",
        payment_amount: Number(tx.paid_amount) || 0,
        change: Number(tx.change_amount) || 0,
      };
    },

    async printReceipt(tx) {
      /* Browser mode: render the receipt into the hidden #print-area and
         call window.print(). The OS print dialog appears — the cashier
         picks the thermal printer and clicks Print. The @media print CSS
         in neu.css makes only #print-area visible. */
      try {
        const printArea = Helpers.$("#print-area");
        const s = State.settings || {};
        const pw = Number(s.paper_width) || 58;
        printArea.innerHTML = this.buildPrintHTML(tx);
        printArea.style.width = pw + "mm";

        // Render QR image into the receipt if a QR URL is set.
        if (s.qr_url) {
          try { await this.injectPrintQR(s.qr_url); } catch (_) { /* optional */ }
        }

        // Defer the print so the DOM paints first.
        await new Promise((r) => setTimeout(r, 100));
        window.print();

        // Clean up after printing.
        setTimeout(() => { printArea.innerHTML = ""; }, 500);
      } catch (e) {
        Notify.error("Cetak Struk Gagal", e.message);
      }
    },

    /* Render a QR image into the print-area receipt (mirrors injectPreviewQR
       but targets #print-qr-img). */
    injectPrintQR(text) {
      return new Promise((resolve, reject) => {
        const renderQR = () => {
          try {
            const img = Helpers.$("#print-qr-img");
            if (img && (global.QRCode || global.qrcode)) {
              const c = document.createElement("canvas");
              (global.QRCode || global.qrcode).toCanvas(c, text, { width: 160 }, () => {
                if (c.toDataURL) img.src = c.toDataURL();
                resolve();
              });
            } else {
              resolve();
            }
          } catch (e) { reject(e); }
        };
        if (global.QRCode || global.qrcode) return renderQR();
        const sc = document.createElement("script");
        sc.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
        sc.onload = renderQR;
        sc.onerror = reject;
        document.head.appendChild(sc);
      });
    },

    /* Build a thermal-receipt HTML block for the #print-area (print-only).
       Uses the .receipt CSS class from neu.css (monospace, black on white). */
    buildPrintHTML(tx) {
      const s = State.settings || {};
      const pw = Number(s.paper_width) || 58;
      const chars = Number(s.paper_chars) || Math.round(pw * 0.55);
      const money = (n) => Helpers.rp(n);
      const W = chars;

      const line2 = (l, r) => {
        const ls = String(l || ""), rs = String(r || "");
        const gap = Math.max(1, W - ls.length - rs.length);
        return ls + " ".repeat(gap) + rs;
      };
      const center = (str) => {
        const t = String(str || "");
        const pad = Math.max(0, Math.floor((W - t.length) / 2));
        return " ".repeat(pad) + t;
      };
      const wrap = (str) => {
        const t = String(str || "");
        const out = [];
        for (let i = 0; i < t.length; i += W) out.push(t.slice(i, i + W));
        return out.join("\n");
      };

      let body = "";
      body += center(s.store_name || "SURANTAKA COFFEE") + "\n";
      if (s.store_address) body += center(s.store_address) + "\n";
      if (s.store_phone) body += center("Telp. " + s.store_phone) + "\n";
      body += "=".repeat(W) + "\n";
      body += line2("Order", tx.order_id || "") + "\n";
      body += line2("Tanggal", Helpers.formatDateTime(tx.order_date)) + "\n";
      body += line2("Kasir", tx.cashier || "-") + "\n";
      body += line2("Platform", tx.platform || "") + "\n";
      body += "-".repeat(W) + "\n";
      (tx.details || []).forEach((d) => {
        body += wrap(`${d.qty} x ${d.product_name}`) + "\n";
        body += line2("", money(d.subtotal)) + "\n";
      });
      body += "-".repeat(W) + "\n";
      body += line2("Subtotal", money(tx.subtotal)) + "\n";
      if (Number(tx.discount_amount) > 0) {
        const dl = tx.discount_type === "percent" ? `Diskon (${tx.discount_value}%)` : "Diskon";
        body += line2(dl, "-" + money(tx.discount_amount)) + "\n";
      }
      body += line2("Grand Total", money(tx.grand_total)) + "\n";
      body += line2("Bayar (" + (tx.payment_method || "CASH") + ")", money(tx.paid_amount)) + "\n";
      body += line2("Kembalian", money(tx.change_amount)) + "\n";
      body += "=".repeat(W) + "\n";
      if (s.footer_note) body += wrap(s.footer_note) + "\n";
      if (s.thank_you) body += center(s.thank_you) + "\n";

      let qrHtml = "";
      if (s.qr_url) {
        qrHtml = `<img class="qr" id="print-qr-img" alt="QR" style="display:block;margin:4px auto;max-width:${Math.min(pw * 0.55, 32)}mm"/>`;
      }

      return `<div class="receipt" style="width:${pw}mm;font-size:${pw <= 58 ? 11 : 13}px">${body}${qrHtml}</div>`;
    },

    /* ------------------------------------ receipt preview modal HTML ------- */
    buildReceiptHTML(tx) {
      const s = State.settings || {};
      const money = (n) => Helpers.rp(n);
      // modal width follows the thermal paper width (58mm≈220px, 80mm≈300px)
      const pwMm = Number(s.paper_width) || 58;
      const modalPx = Math.round(pwMm * 3.78); // 1mm ≈ 3.78px @96dpi

      // --- Header toko ---
      let html = `<div class="receipt-preview" style="width:${modalPx}px">`;
      html += `<div class="rp-header">`;
      html += `<div class="rp-store-name">${Helpers.escape(s.store_name || "SURANTAKA COFFEE")}</div>`;
      if (s.store_address) html += `<div class="rp-store-info">${Helpers.escape(s.store_address)}</div>`;
      if (s.store_phone) html += `<div class="rp-store-info">Telp. ${Helpers.escape(s.store_phone)}</div>`;
      html += `</div>`;
      html += `<hr class="rp-separator"/>`;

      // --- Info transaksi ---
      html += `<div class="rp-row"><span class="label">Order ID</span><span class="value">${Helpers.escape(tx.order_id)}</span></div>`;
      html += `<div class="rp-row"><span class="label">Tanggal</span><span class="value">${Helpers.formatDateTime(tx.order_date)}</span></div>`;
      html += `<div class="rp-row"><span class="label">Kasir</span><span class="value">${Helpers.escape(tx.cashier || "-")}</span></div>`;
      html += `<div class="rp-row"><span class="label">Platform</span><span class="value">${Helpers.escape(tx.platform)}</span></div>`;
      html += `<hr class="rp-separator"/>`;

      // --- Daftar item ---
      (tx.details || []).forEach((d) => {
        const itemLabel = `${d.qty} x ${Helpers.escape(d.product_name)}`;
        html += `<div class="rp-item">`;
        html += `<span class="item-left">${itemLabel}</span>`;
        html += `<span class="item-price">${money(d.subtotal)}</span>`;
        html += `</div>`;
      });
      html += `<hr class="rp-separator"/>`;

      // --- Ringkasan pembayaran ---
      html += `<div class="rp-row"><span class="label">Total</span><span class="value">${money(tx.subtotal)}</span></div>`;
      if (tx.discount_amount > 0) {
        const discLabel = tx.discount_type === "percent"
          ? `Diskon (${tx.discount_value}%)`
          : "Diskon";
        html += `<div class="rp-row rp-disc"><span class="label">${discLabel}</span><span class="value">-${money(tx.discount_amount)}</span></div>`;
      }
      html += `<div class="rp-row rp-grand"><span class="label">Grand Total</span><span class="value">${money(tx.grand_total)}</span></div>`;
      html += `<hr class="rp-separator"/>`;

      // --- Info pembayaran ---
      html += `<div class="rp-row"><span class="label">Payment (${Helpers.escape(tx.payment_method || "CASH")})</span><span class="value">${money(tx.paid_amount)}</span></div>`;
      html += `<div class="rp-row"><span class="label">Kembalian</span><span class="value">${money(tx.change_amount)}</span></div>`;
      html += `<hr class="rp-separator"/>`;

      // --- Pesan promosi ---
      if (s.footer_note) {
        html += `<div class="rp-promo">${Helpers.escape(s.footer_note)}</div>`;
      }

      // --- QR Code (generated from WhatsApp/URL) ---
      if (s.qr_url) {
        html += `<img class="rp-qr" id="receipt-preview-qr" alt="QR Code" />`;
      } else {
        html += `<div class="rp-qr-placeholder">QR Code belum dibuat</div>`;
      }

      // --- Footer ---
      if (s.thank_you) {
        html += `<div class="rp-footer">${Helpers.escape(s.thank_you)}</div>`;
      }

      html += `</div>`;
      return html;
    },

    injectPreviewQR(text) {
      return new Promise((resolve, reject) => {
        const renderQR = () => {
          try {
            const img = Helpers.$("#receipt-preview-qr");
            if (img) {
              const c = document.createElement("canvas");
              (global.QRCode || global.qrcode).toCanvas(c, text, { width: 200 }, () => {
                if (c.toDataURL) img.src = c.toDataURL();
                resolve();
              });
            } else {
              resolve();
            }
          } catch (e) { reject(e); }
        };
        if (global.QRCode || global.qrcode) return renderQR();
        const sc = document.createElement("script");
        sc.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
        sc.onload = renderQR;
        sc.onerror = reject;
        document.head.appendChild(sc);
      });
    },
  };

  global.TransactionView = TransactionView;
})(window);
