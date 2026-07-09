/* ==========================================================================
   views/dashboard.js — admin dashboard (summary cards + revenue chart)
   ========================================================================== */
(function (global) {
  "use strict";

  let chartInstance = null;
  let lastDaily = null;

  const DashboardView = {
    async render() {
      const root = Helpers.$("#view-dashboard");
      root.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6" id="dash-cards"></div>
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div class="xl:col-span-2 neu-card rounded-3xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-slate-700">Pendapatan 7 Hari Terakhir</h3>
              <span class="neu-badge text-slate-500">Omset Harian</span>
            </div>
            <div class="relative" style="height:300px"><canvas id="revenueChart"></canvas></div>
          </div>
          <div class="neu-card rounded-3xl p-6">
            <h3 class="font-semibold text-slate-700 mb-4">Stok Menipis</h3>
            <div id="low-stock-list" class="space-y-3"></div>
          </div>
        </div>
      `;
      // Fetch async tanpa memblokir UI
      this.loadData();
    },

    async onShow() {
      // Segarkan data saat tab dibuka lagi
      this.loadData();
    },

    async loadData() {
      try {
        const [summary, daily] = await Promise.all([
          API.dashboardSummary(),
          API.dailyRevenue(7),
        ]);
        this.renderCards(summary);
        this.renderChart(daily);
        this.renderLowStock(summary.low_stock_products || []);
      } catch (e) {
        if (/unauthorized|akses/i.test(e.message)) Notify.accessDenied();
        else Notify.error("Gagal memuat dashboard", e.message);
      }
    },

    renderCards(s) {
      const cards = [
        { label: "Omset Hari Ini", value: Helpers.rp(s.today_turnover), icon: "💰", tone: "text-neu-success" },
        { label: "Profit Hari Ini", value: Helpers.rp(s.today_profit), icon: "📈", tone: "text-neu-accent" },
        { label: "Transaksi Hari Ini", value: Helpers.formatQty(s.today_transactions), icon: "🧾", tone: "text-neu-accent2" },
        { label: "Total Produk", value: Helpers.formatQty(s.total_products), icon: "📦", tone: "text-neu-warn" },
        { label: "Omset Bulan Ini", value: Helpers.rp(s.month_turnover), icon: "🗓️", tone: "text-neu-success" },
        { label: "Profit Bulan Ini", value: Helpers.rp(s.month_profit), icon: "🏆", tone: "text-neu-accent" },
        { label: "Transaksi Bulan Ini", value: Helpers.formatQty(s.month_transactions), icon: "🛒", tone: "text-neu-accent2" },
        { label: "Stok Menipis", value: Helpers.formatQty(s.low_stock_count), icon: "⚠️", tone: "text-neu-danger" },
      ];
      const host = Helpers.$("#dash-cards");
      host.innerHTML = cards.map((c) => `
        <div class="neu-card rounded-3xl p-5 flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl neu-pressed flex items-center justify-center text-2xl">${c.icon}</div>
          <div class="min-w-0">
            <p class="text-xs text-slate-400 uppercase tracking-wide">${c.label}</p>
            <p class="text-xl font-semibold ${c.tone} mt-1 truncate">${c.value}</p>
          </div>
        </div>
      `).join("");
    },

    renderChart(daily) {
      const ctx = Helpers.$("#revenueChart");
      const p = Theme.palette();
      // remember the data so we can re-render live when the theme changes
      lastDaily = daily;
      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: daily.map((d) => d.label),
          datasets: [
            {
              label: "Omset",
              data: daily.map((d) => d.turnover),
              backgroundColor: p.accentBar,
              borderRadius: 8,
            },
            {
              label: "Profit",
              data: daily.map((d) => d.profit),
              backgroundColor: p.successBar,
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: p.text } },
            tooltip: {
              callbacks: { label: (c) => `${c.dataset.label}: ${Helpers.rp(c.raw)}` },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: p.text } },
            y: {
              grid: { color: p.grid },
              ticks: { color: p.text, callback: (v) => "Rp" + v.toLocaleString("id-ID") },
            },
          },
        },
      });
    },

    /* re-tint the existing chart when the theme is toggled */
    retintChart() {
      if (chartInstance && lastDaily) this.renderChart(lastDaily);
    },

    renderLowStock(items) {
      const host = Helpers.$("#low-stock-list");
      if (!items.length) {
        host.innerHTML = `<p class="text-sm text-slate-400 text-center py-8">Semua stok aman 👍</p>`;
        return;
      }
      host.innerHTML = items.map((p) => {
        const totalStock = Number(p.stock_normal || 0) + Number(p.stock_medium || 0) + Number(p.stock_max || 0) || Number(p.stock || 0);
        return `
        <div class="neu-inset rounded-2xl p-3 flex items-center justify-between">
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-700 truncate">${Helpers.escape(p.name)}</p>
            <p class="text-xs text-slate-400">${Helpers.escape(p.category_name || "Tanpa kategori")}</p>
          </div>
          <span class="neu-badge text-neu-danger font-bold">${totalStock} pcs</span>
        </div>`;
      }).join("");
    },
  };

  global.DashboardView = DashboardView;
})(window);
