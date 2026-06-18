# 🏋️ Gym Cemerlang — Full-Stack App

Sistem manajemen keanggotaan gym berbasis **React + TypeScript (frontend)** dan **Express.js + PostgreSQL (backend)**.

---

## 📁 Struktur Proyek

```
cemer-main/
├── cemer-frontend/        ← React + Vite + TypeScript
│   ├── src/
│   │   ├── lib/api.ts     ← API client (semua fetch ke backend)
│   │   ├── store/         ← Zustand stores (pakai API)
│   │   ├── pages/         ← Halaman publik & admin
│   │   └── components/    ← UI components
│   └── .env.example
│
└── cemer-backend/         ← Express.js + PostgreSQL
    ├── src/
    │   ├── index.js       ← Entry point
    │   ├── routes/        ← Route definitions
    │   ├── controllers/   ← Business logic
    │   ├── middleware/     ← JWT auth middleware
    │   └── db/
    │       ├── pool.js    ← PostgreSQL pool
    │       └── schema.sql ← DDL + seed data
    └── .env.example
```

---

## ⚙️ Prasyarat

- **Node.js** v18+
- **PostgreSQL** v14+
- **npm** atau **yarn**

---

## 🐘 Setup Database

### 1. Buat database PostgreSQL

```bash
psql -U postgres
CREATE DATABASE gym_cemerlang;
\q
```

### 2. Jalankan schema SQL

```bash
psql -U postgres -d gym_cemerlang -f cemer-backend/src/db/schema.sql
```

> Schema ini akan membuat semua tabel dan mengisi **data awal** (trainer, member contoh, notifikasi, dll).

---

## 🚀 Setup Backend (Express.js)

### 1. Masuk ke folder backend

```bash
cd cemer-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file `.env`

```bash
cp .env.example .env
```

Edit `.env` sesuai konfigurasi Anda:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/gym_cemerlang
JWT_SECRET=ganti_dengan_secret_yang_kuat
FRONTEND_URL=http://localhost:5173
```

### 4. Jalankan backend

```bash
# Development (dengan auto-reload)
npm run dev

# Production
npm start
```

Backend akan berjalan di: **http://localhost:3001**

---

## 🖥️ Setup Frontend (React + Vite)

### 1. Masuk ke folder frontend

```bash
cd cemer-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file `.env`

```bash
cp .env.example .env
```

Isi `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Jalankan frontend

```bash
npm run dev
```

Frontend akan berjalan di: **http://localhost:5173**

---

## 🔑 Akun Admin Default

| Field    | Value                        |
|----------|------------------------------|
| Email    | `admin@gymcemerlang.com`     |
| Password | `admin123`                   |
| URL      | http://localhost:5173/admin/login |

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint            | Akses   | Deskripsi              |
|--------|---------------------|---------|------------------------|
| POST   | `/api/auth/login`   | Public  | Login admin            |
| GET    | `/api/auth/profile` | Admin   | Profil admin           |
| PUT    | `/api/auth/password`| Admin   | Ubah password          |

### Members
| Method | Endpoint                    | Akses   | Deskripsi                    |
|--------|-----------------------------|---------|------------------------------|
| POST   | `/api/members/register`     | Public  | Pendaftaran member baru      |
| GET    | `/api/members/check?q=...`  | Public  | Cek status keanggotaan       |
| GET    | `/api/members`              | Admin   | List semua member (+ filter) |
| POST   | `/api/members`              | Admin   | Tambah member (admin)        |
| GET    | `/api/members/:id`          | Admin   | Detail member                |
| PATCH  | `/api/members/:id`          | Admin   | Update member                |
| DELETE | `/api/members/:id`          | Admin   | Hapus member                 |

### Dashboard & Laporan
| Method | Endpoint                         | Akses | Deskripsi                |
|--------|----------------------------------|-------|--------------------------|
| GET    | `/api/dashboard/stats`           | Admin | Statistik dashboard      |
| GET    | `/api/dashboard/chart`           | Admin | Data grafik (6 bulan)    |
| GET    | `/api/dashboard/plan-distribution` | Admin | Distribusi paket        |
| GET    | `/api/reports?year=2026`         | Admin | Laporan tahunan lengkap  |

### Lainnya
| Method | Endpoint                            | Akses  | Deskripsi               |
|--------|-------------------------------------|--------|-------------------------|
| GET    | `/api/trainers`                     | Public | Daftar trainer          |
| GET    | `/api/notifications`                | Admin  | List notifikasi         |
| PATCH  | `/api/notifications/:id/read`       | Admin  | Tandai sudah dibaca     |
| PATCH  | `/api/notifications/mark-all-read`  | Admin  | Tandai semua dibaca     |
| GET    | `/api/settings`                     | Admin  | Pengaturan gym          |
| PUT    | `/api/settings`                     | Admin  | Update pengaturan gym   |

---

## 🗃️ Skema Database

### Tabel Utama

| Tabel               | Deskripsi                              |
|---------------------|----------------------------------------|
| `admin_users`       | Akun admin dengan password ter-hash    |
| `members`           | Data keanggotaan gym                   |
| `trainers`          | Data personal trainer                  |
| `trainer_schedules` | Jadwal tersedia per trainer            |
| `notifications`     | Notifikasi/pengumuman gym              |
| `gym_settings`      | Konfigurasi informasi gym              |

---

## 🔧 Fitur yang Tersimpan di Database

| Fitur                         | Disimpan |
|-------------------------------|----------|
| Pendaftaran member baru       | ✅ PostgreSQL |
| Cek status keanggotaan        | ✅ PostgreSQL |
| Data member (CRUD)            | ✅ PostgreSQL |
| Login admin (JWT)             | ✅ PostgreSQL |
| Dashboard stats real-time     | ✅ Dihitung dari DB |
| Grafik tren (6 bulan)         | ✅ Query DB |
| Distribusi paket              | ✅ Query DB |
| Laporan tahunan               | ✅ Query DB |
| Notifikasi                    | ✅ PostgreSQL |
| Pengaturan gym                | ✅ PostgreSQL |
| Data trainer & jadwal         | ✅ PostgreSQL |

---

## 🚢 Deploy ke Produksi

### Backend
1. Set `NODE_ENV=production` di `.env`
2. Gunakan `DATABASE_URL` dari provider (Railway, Render, Supabase, dll)
3. Ganti `JWT_SECRET` dengan string acak yang panjang

### Frontend
```bash
npm run build
# Upload folder dist/ ke hosting statis (Vercel, Netlify, dll)
# Atau serve dengan nginx/caddy
```

Ubah `VITE_API_URL` ke URL backend produksi sebelum build.

---

## 🛠️ Tech Stack

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · Zustand · React Router · Recharts · Framer Motion  
**Backend:** Node.js · Express.js · PostgreSQL · JWT · bcryptjs  
