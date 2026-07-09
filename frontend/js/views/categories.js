/* ==========================================================================
   views/categories.js — category CRUD
   ========================================================================== */
(function (global) {
  "use strict";

  const CategoriesView = {
    async render() {
      const root = Helpers.$("#view-categories");
      root.innerHTML = `
        <div class="flex justify-between items-center mb-6">
          <p class="text-sm text-slate-400">Kelola kategori produk.</p>
          <button id="cat-add" class="neu-btn-primary">+ Tambah Kategori</button>
        </div>
        <div id="cat-list" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
      `;
      Helpers.$("#cat-add").addEventListener("click", () => this.openForm());
      this.refresh();
    },

    async onShow() {
      this.refresh();
    },

    async refresh() {
      try {
        const rows = await API.listCategories();
        const host = Helpers.$("#cat-list");
        if (!rows.length) {
          host.innerHTML = `<div class="col-span-full neu-card rounded-3xl p-10 text-center text-slate-400">Belum ada kategori.</div>`;
          return;
        }
        host.innerHTML = rows.map((c) => `
          <div class="neu-card rounded-3xl p-5 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-slate-700 truncate">${Helpers.escape(c.name)}</p>
              <p class="text-xs text-slate-400 truncate">${Helpers.escape(c.description || "Tanpa deskripsi")}</p>
            </div>
            <div class="flex gap-2 shrink-0">
              <button class="neu-icon-btn cat-edit" data-id="${c.id}">✏️</button>
              <button class="neu-icon-btn cat-del" data-id="${c.id}">🗑️</button>
            </div>
          </div>
        `).join("");
        Helpers.$$(".cat-edit").forEach((b) => b.addEventListener("click", () => this.openForm(Number(b.dataset.id))));
        Helpers.$$(".cat-del").forEach((b) => b.addEventListener("click", () => this.confirmDelete(Number(b.dataset.id))));
      } catch (e) {
        // silent
      }
    },

    async openForm(id = null) {
      let cat = null;
      if (id) {
        const rows = await API.listCategories();
        cat = rows.find((c) => Number(c.id) === Number(id));
      }
      const html = `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1 ml-1">NAMA KATEGORI *</label>
            <input id="c-name" class="neu-input" value="${cat ? Helpers.escape(cat.name) : ""}" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1 ml-1">DESKRIPSI</label>
            <textarea id="c-desc" rows="3" class="neu-textarea">${cat ? Helpers.escape(cat.description || "") : ""}</textarea>
          </div>
        </div>`;
      global.__modalPreConfirm = async () => {
        const name = Helpers.$("#c-name").value.trim();
        const desc = Helpers.$("#c-desc").value.trim();
        if (!name) throw new Error("Nama kategori wajib diisi");
        try {
          if (id) await API.updateCategory(id, name, desc);
          else await API.createCategory(name, desc);
          return true;
        } catch (e) {
          throw new Error(e.message || "Gagal menyimpan");
        }
      };
      Notify.modal({ title: id ? "Edit Kategori" : "Tambah Kategori", html, confirmText: "Simpan" })
        .then(async (res) => {
          global.__modalPreConfirm = null;
          if (res.isConfirmed) {
            await this.refresh();
          }
        });
    },

    async confirmDelete(id) {
      const ok = await Notify.confirm("Hapus kategori ini?", "Produk terkait akan kehilangan kategori.");
      if (!ok) return;
      try {
        await API.deleteCategory(id);
        await this.refresh();
      } catch (e) {
        Notify.error("Gagal menghapus", e.message);
      }
    },
  };

  global.CategoriesView = CategoriesView;
})(window);
