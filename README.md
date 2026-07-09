# Mokundo Kasir — Aplikasi Kasir Web + PWA

Aplikasi kasir (Point of Sale) **100% client-side** berbasis **IndexedDB** +
**Tailwind CSS**. Bisa di-host di **GitHub Pages** (gratis, 24/7) atau dibuka
langsung dari file (`file://`).

> **Catatan:** Data tersimpan di IndexedDB browser — **1 browser = 1 database**.
> Data tidak otomatis sync antar device.

---

## ✨ Fitur

| Modul | Admin | Kasir |
|-------|:-----:|:-----:|
| Dashboard (omset, profit, grafik 7 hari, stok menipis) | ✅ | ❌ |
| CRUD Produk (3 varian: Normal / Medium / Max + upload gambar) | ✅ | ❌ |
| CRUD Kategori | ✅ | ❌ |
| Transaksi Penjualan + Keranjang + Varian Pop-up | ✅ | ✅ |
| Checkout (diskon % / Rp, kembalian, atomic transaction) | ✅ | ✅ |
| Cetak Struk via `window.print()` (printer thermal 58mm/80mm) | ✅ | ✅ |
| Laporan Keuangan (filter tanggal + platform) | ✅ | ❌ |
| Pengaturan Toko & QR Code (URL WA / custom / upload gambar) | ✅ | ❌ |
| 🌙 **Dark / Light Mode** (toggle switch, anti-flash, persisten) | ✅ | ✅ |

Platform yang didukung: **Pickup, Take Away, GrabFood, ShopeeFood, GoFood**.

---

## 🚀 Cara Menjalankan di Lokal

### Opsi 1: Buka langsung di browser (paling mudah)
Cukup **double-click `index.html`** — tidak perlu server apa pun!
IndexedDB bekerja normal dari protokol `file://`.

### Opsi 2: HTTP server lokal (diperlukan untuk Service Worker / PWA)
Service Worker hanya bisa berjalan dari HTTP/HTTPS (bukan `file://`).
Pilih salah satu:

```bash
# Python (sudah terinstall di kebanyakan komputer)
python -m http.server 5000

# atau Node.js
npx serve .

# atau PHP
php -S localhost:5000
```

Lalu buka **`http://localhost:5000`** di browser.

### Login Default
| Role  | Username | Password |
|-------|----------|----------|
| Admin | `admin`  | `admin`  |
| Kasir | `kasir`  | `kasir`  |

---

## 📱 PWA — Install ke Home Screen
1. Buka URL aplikasi di **Chrome** (Android) atau **Safari** (iPhone)
2. Chrome: tap **⋮** → **"Install app"**
   Safari: tap **↑** → **"Add to Home Screen"**
3. Aplikasi muncul di home screen dengan ikon & nama toko Anda
4. Full-screen, tanpa address bar, seperti aplikasi native!

---

## 🏗️ Struktur Folder (Modular)

```
mokundo-kasir/
├── index.html              # SPA entry point
├── manifest.json           # PWA manifest (nama ikut settings)
├── sw.js                   # Service Worker (offline app-shell cache)
├── README.md
├── css/
│   └── neu.css             # Custom styles + dark/light theme + print
├── icons/                  # PWA icons (auto-generated from logo)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   ├── favicon-16.png
│   └── favicon-32.png
└── js/
    ├── db.js               # IndexedDB layer (buka DB, CRUD, seeding)
    ├── backend.js          # Business logic (auth, products, transactions, dll)
    ├── api.js              # Wrapper async → memanggil Backend.* + RBAC
    ├── helpers.js          # Utility (formatRp, escape, fileToBase64, dll)
    ├── notify.js           # SweetAlert2 notifications
    ├── state.js            # App state (user, settings, cart)
    ├── theme.js            # Dark/Light theme manager
    ├── router.js           # SPA router + RBAC menu filter
    ├── app.js              # Bootstrap
    └── views/              # Halaman SPA (modular per fitur)
        ├── login.js        # Halaman login
        ├── dashboard.js    # Dashboard admin (summary + chart)
        ├── products.js     # CRUD produk + varian + upload gambar
        ├── categories.js   # CRUD kategori
        ├── transaction.js  # Kasir: katalog → keranjang → checkout → cetak
        ├── reports.js      # Laporan keuangan + filter
        └── settings.js     # Pengaturan toko, struk, QR, branding
```

### Alur Data
1. `Db.init()` → buka IndexedDB, seed data awal jika DB baru
2. `Backend.*` → business logic (validasi, hitung diskon/profit, generate Order ID)
3. `API.*` → wrapper yang menegakkan RBAC (`requireAdmin`, `requireLogin`)
4. Views (`*View.render()`) → memanggil `API.*`, render UI

---

## 🌐 Deploy ke GitHub Pages

1. **Rename folder** root menjadi `mokundo-kasir` (klik kanan → Rename)

2. **Init Git & push ke GitHub**
   ```bash
   cd mokundo-kasir
   git init
   git add .
   git commit -m "Initial commit: Mokundo Kasir"
   git branch -M main
   git remote add origin https://github.com/USERNAME/mokundo-kasir.git
   git push -u origin main
   ```

3. **Aktifkan GitHub Pages**
   - Buka repo di GitHub → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` — folder: **`/ (root)`**
   - **Save**

4. **Buka aplikasi** (butuh ~1 menit untuk build pertama)
   ```
   https://USERNAME.github.io/mokundo-kasir/
   ```

---

## 🧾 Contoh Order ID
- Format: **`MK-260710-0001`**
- `<PREFIX>-<YYMMDD>-<nomor urut 4 digit>`
- Prefix default `MK` (bisa diganti di Pengaturan Toko)

---

## 🖨️ Cetak Struk
- Mode browser: klik **"🖨️ Cetak Struk"** → dialog cetak browser muncul
- Pilih printer thermal Anda, set margin ke **None/Pas**, lalu cetak
- Lebar kertas bisa diatur di **Pengaturan → 58mm / 80mm / Custom**

---

## 📦 Dependensi (semua via CDN — tidak perlu install)
- **Tailwind CSS** — utility-first CSS
- **SweetAlert2** — dialog & notifikasi
- **Chart.js** — grafik dashboard
- **Cropper.js** — crop gambar produk
- **QRCode.js** — generate QR code di struk (dimuat on-demand)

---

## 🔒 Catatan Keamanan
- Password disimpan plain-text untuk kesederhanaan. Untuk produksi, hash
  password (mis. `bcrypt` / `argon2`).
- Data IndexedDB bisa di-inspect dari DevTools — jangan simpan data sensitif.
- Backup database secara berkala (Settings → Export data di masa depan).
