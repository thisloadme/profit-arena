# Financial Simulation Arena

Game simulasi finansial multiplayer berbasis web — belajar literasi keuangan lewat simulasi pasar saham/crypto, bisnis, investasi, dan pinjaman. Lihat [`PRD.md`](./PRD.md), [`SRS.md`](./SRS.md), [`DESIGN.md`](./DESIGN.md), dan [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) untuk spesifikasi lengkap.

## Tech Stack
- **Runtime**: Bun + Node 22
- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript strict)
- **DB**: PostgreSQL + Prisma 6
- **Auth**: jose (JWT) + bcryptjs (rolled — lihat catatan di bawah)
- **Realtime**: Socket.io (custom Next server, single process)
- **UI**: Tailwind v4 (light only, compact), shadcn-style primitives, Recharts, Framer Motion
- **Validasi**: Zod + React Hook Form

## Quick Start (dev)

```bash
# 1. Install deps
bun install

# 2. Copy env
cp .env.example .env
# Edit DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32), dst.

# 3. Database
bunx prisma migrate deploy
bun run db:seed

# 4. Jalankan server (Next + Socket.io + ticker engine)
./run.sh
```

Buka `http://localhost:3004`. Login demo: `alice@example.com` / `password123`.

### Variabel env penting
| Key | Tujuan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL |
| `NEXTAUTH_SECRET` | Signing key JWT session |
| `NEXTAUTH_URL` | Base URL app (harus match origin) |
| `PORT` | Port server (default 3004) |
| `TICK_INTERVAL_MS` | Interval tick engine (default 10000) |
| `START_TICKER_IN_DEV` | Set `1` untuk auto-start ticker di dev |

## Scripts
| Perintah | Fungsi |
|---|---|
| `bun run dev` | Start dev server (Next + Socket + ticker jika `START_TICKER_IN_DEV=1`) |
| `bun run build` | Build production |
| `bun run start` | Start production server |
| `bun run typecheck` | TypeScript strict check |
| `bun run lint` | Next lint |
| `bun run db:migrate` | Buat & apply migration baru |
| `bun run db:deploy` | Apply migration yang pending |
| `bun run db:seed` | Seed market universe + user demo |
| `bun run db:studio` | Prisma Studio GUI |

## Struktur
```
src/
  app/                # App Router pages + API routes
  components/         # ui/ primitives, layout/, features/
  config/             # game.ts, assets.ts, events.ts (single source of truth)
  hooks/              # use-socket.ts, dll
  lib/                # prisma.ts, auth.ts, auth-config.ts, validations.ts
  server/             # server-only: engine/ (tick, price, socket), services/
  types/              # shared TS types
prisma/               # schema.prisma + migrations + seed.ts
server.ts             # custom Next server (HTTP + Socket.io)
```

## Catatan desain
- **Bahasa**: Semua teks label UI **English only** (target global). Game content (event descriptions, business names, dll) juga dalam English.
- **Landing page**: Animated one-page di `/` (100vh, no scroll, framer-motion). User diarahkan ke auth pages.
- **Light mode only, compact density, palet dimmed** (DESIGN.md v1.1). Tidak ada dark mode.
- **Auth rolled dengan jose JWT** karena NextAuth v4 tidak compatible dengan Next 16 Route Handler body parsing (authorize callback tidak terpanggil). Auth.js v5 beta adalah alternatif. Implementasi kita: ~80 LOC di `src/lib/auth.ts` + `auth-config.ts`.
- **Tick engine** single-process dengan mutex. Untuk multi-instance, ganti adapter Socket.io ke Redis dan jalankan engine di worker terpisah (Fase 13).
- **Anti-cheat**: semua harga & transaksi server-authoritative — client tidak pernah kirim harga.

## Status implementasi
Lihat [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md). Selesai: **Fase 0–3** (bootstrap, prisma, design system, auth, simulation engine + real-time broadcast). Berikutnya: Fase 4 (layout & navigasi) → Fase 5 (dashboard) → Fase 6 (market & trade) → dst.
