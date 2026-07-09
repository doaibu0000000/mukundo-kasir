/* ==========================================================================
   views/reports.js — financial report with date range + platform filter
   ========================================================================== */
(function (global) {
  "use strict";

  const PLATFORMS = ["Pickup", "Take Away", "GrabFood", "ShopeeFood", "GoFood"];

  const ReportsView = {
    async render() {
      const today = Helpers.todayISO();
      const root = Helpers.$("#view-reports");
      root.innerHTML = `
        <div class="neu-card rounded-3xl p-5 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label class="block text-xs text-slate-400 mb-1 ml-1">DARI TANGGAL</label>
              <input id="rp-from" type="date" class="neu-input" value="${today}" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1 ml-1">SAMPAI TANGGAL</label>
              <input id="rp-to" type="date" class="neu-input" value="${today}" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1 ml-1">PLATFORM</label>
              <select id="rp-platform" class="neu-select">
                <option value="">Semua</option>
                ${PLATFORMS.map((p) => `<option value="${p}">${p}</option>`).join("")}
              </select>
            </div>
            <button id="rp-run" class="neu-btn-primary">Tampilkan</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div class="neu-card rounded-3xl p-5 flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl neu-pressed flex items-center justify-center text-2xl">💰</div>
            <div><p class="text-xs text-slate-400 uppercase">Omset</p><p id="rp-omset" class="text-xl font-semibold text-neu-success">Rp0</p></div>
          </div>
          <div class="neu-card rounded-3xl p-5 flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl neu-pressed flex items-center justify-center text-2xl">📈</div>
            <div><p class="text-xs text-slate-400 uppercase">Keuntungan Bersih</p><p id="rp-profit" class="text-xl font-semibold text-neu-accent">Rp0</p></div>
          </div>
          <div class="neu-card rounded-3xl p-5 flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl neu-pressed flex items-center justify-center text-2xl">🧾</div>
            <div><p class="text-xs text-slate-400 uppercase">Transaksi</p><p id="rp-count" class="text-xl font-semibold text-neu-accent2">0</p></div>
          </div>
        </div>

        <div class="neu-card rounded-3xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-slate-700">Riwayat Transaksi</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-slate-400 border-b border-white/60">
                  <th class="py-3 px-2">Order ID</th>
                  <th class="py-3 px-2">Tanggal</th>
                  <th class="py-3 px-2">Platform</th>
                  <th class="py-3 px-2">Kasir</th>
                  <th class="py-3 px-2 text-right">Total</th>
                  <th class="py-3 px-2 text-right">Profit</th>
                  <th class="py-3 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody id="rp-tbody"></tbody>
            </table>
          </div>
        </div>
      `;

      Helpers.$("#rp-run").addEventListener("click", () => this.load());
      this.load();
    },

    async onShow() {
      this.load();
    },

    async load() {
      const from = Helpers.$("#rp-from").value;
      const to = Helpers.$("#rp-to").value;
      const platform = Helpers.$("#rp-platform").value;
      try {
        const data = await API.financialReport(from, to, platform);
        const t = data.totals || {};
        Helpers.$("#rp-omset").textContent = Helpers.rp(t.turnover);
        Helpers.$("#rp-profit").textContent = Helpers.rp(t.profit);
        Helpers.$("#rp-count").textContent = Helpers.formatQty(t.count);

        const tbody = Helpers.$("#rp-tbody");
        const rows = data.transactions || [];
        if (!rows.length) {
          tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-400">Tidak ada transaksi pada rentang ini.</td></tr>`;
          return;
        }
        tbody.innerHTML = rows.map((r) => `
          <tr class="border-b border-white/40 hover:bg-white/30">
            <td class="py-3 px-2 font-medium text-slate-700">${Helpers.escape(r.order_id)}</td>
            <td class="py-3 px-2 text-slate-500">${Helpers.formatDateTime(r.order_date)}</td>
            <td class="py-3 px-2"><span class="neu-badge text-slate-500">${Helpers.escape(r.platform)}</span></td>
            <td class="py-3 px-2 text-slate-500">${Helpers.escape(r.cashier || "-")}</td>
            <td class="py-3 px-2 text-right font-medium">${Helpers.rp(r.grand_total)}</td>
            <td class="py-3 px-2 text-right text-neu-success font-medium">${Helpers.rp(r.total_profit)}</td>
            <td class="py-3 px-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <button class="neu-icon-btn rp-view" data-id="${r.id}" style="width:30px;height:30px" title="Lihat">👁️</button>
                <button class="neu-icon-btn rp-del" data-id="${r.id}" style="width:30px;height:30px" title="Hapus">🗑️</button>
              </div>
            </td>
          </tr>`).join("");

        Helpers.$$(".rp-view").forEach((b) => b.addEventListener("click", () => this.viewDetail(Number(b.dataset.id))));
        Helpers.$$(".rp-del").forEach((b) => b.addEventListener("click", () => this.confirmDelete(Number(b.dataset.id))));
      } catch (e) {
        // silent
      }
    },

    async viewDetail(id) {
      try {
        const tx = await API.getTransaction(id);
        if (!tx) return Notify.warning("Transaksi tidak ditemukan");
        const items = (tx.details || []).map((d) => `
          <div class="flex justify-between text-sm py-1">
            <span>${d.qty} × ${Helpers.escape(d.product_name)}</span>
            <span>${Helpers.rp(d.subtotal)}</span>
          </div>`).join("");
        const html = `
          <div class="text-left">
            <p class="font-semibold text-slate-700">${Helpers.escape(tx.order_id)}</p>
            <p class="text-xs text-slate-400 mb-3">${Helpers.formatDateTime(tx.order_date)} · ${Helpers.escape(tx.platform)}</p>
            <div class="neu-inset rounded-2xl p-3 mb-3">${items}</div>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between"><span class="text-slate-400">Subtotal</span><span>${Helpers.rp(tx.subtotal)}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Diskon</span><span>− ${Helpers.rp(tx.discount_amount)}</span></div>
              <div class="flex justify-between font-semibold"><span>Grand Total</span><span>${Helpers.rp(tx.grand_total)}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Bayar</span><span>${Helpers.rp(tx.paid_amount)}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Kembalian</span><span>${Helpers.rp(tx.change_amount)}</span></div>
            </div>
          </div>`;
        Swal.fire({ title: "Detail Transaksi", html, customClass: { popup: "neu-popup", confirmButton: "neu-btn-primary" }, buttonsStyling: false, confirmButtonText: "Tutup" });
      } catch (e) {
        Notify.error("Gagal memuat detail", e.message);
      }
    },

    async confirmDelete(id) {
      const ok = await Notify.confirm("Hapus transaksi ini?", "Data transaksi akan dihapus permanen.");
      if (!ok) return;
      try {
        await API.deleteTransaction(id);
        await this.load();
      } catch (e) {
        Notify.error("Gagal menghapus", e.message);
      }
    },
  };

  global.ReportsView = ReportsView;
})(window);
