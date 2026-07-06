# Implementation Checklist — Financial Simulation Arena

**Version**: 1.0 (MVP)
**Date**: Juli 2026
**Source**: PRD.md, SRS.md, DESIGN.md, schema.prisma
**Stack**: Next.js 14+ (App Router) · TypeScript · TailwindCSS · shadcn/ui · Recharts · Socket.io · Prisma + PostgreSQL · NextAuth.js · Vercel + Neon · **Bun** (package manager & runtime)

> **Cara pakai**: Check dengan `[x]` setiap task selesai. Setiap fase memiliki **Definition of Done (DoD)** yang harus terpenuhi sebelum lanjut ke fase berikutnya. Urutan fase sudah memperhatikan dependency.

---

## FASE 0 — Project Bootstrap & Tooling

### 0.1 Inisialisasi Project
- [x] 0.1.1 Install **Bun** (`curl -fsSL https://bun.sh/install | bash`), verifikasi `bun --version` (v1.3.10).
- [x] 0.1.2 Jalankan `bunx create-next-app@latest` dengan TypeScript + Tailwind + App Router + ESLint (Next 16.2, React 19, Tailwind v4).
- [x] 0.1.3 Hapus setup dark mode bawaan Tailwind (light theme only).
- [x] 0.1.4 Aktifkan **TypeScript strict mode** (`tsconfig.json` → `"strict": true`).
- [x] 0.1.5 Setup path alias `@/*` → `./src/*`.
- [x] 0.1.6 Buat struktur folder standar:
  ```
  src/
    app/            (routes & pages)
    components/     (ui, layout, features)
    lib/            (utils, prisma client, helpers)
    hooks/          (custom react hooks)
    server/         (server-only: services, socket, tick engine)
    types/          (shared TS types)
    config/         (constants, game config)
  prisma/
  public/
  ```
- [x] 0.1.7 Install deps: `prisma`, `@prisma/client`, `bcryptjs`, `socket.io`, `socket.io-client`, `next-auth` (awal), `recharts`, `framer-motion`, `lucide-react`, `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `clsx`, `tailwind-merge`.
  Dev deps: `tsx`, `prettier`, `prettier-plugin-tailwindcss`, `husky`, `lint-staged`, `@types/bcryptjs`.
- [x] 0.1.8 Setup **Prettier** + **ESLint** config (`.prettierrc.json`).
- [x] 0.1.9 Tambahkan `.env.example` dengan semua key.
- [ ] 0.1.10 Buat `.editorconfig` dan `.node-version` / `.nvmrc` — *skip, not critical*.
- [x] 0.1.11 Konfigurasi `package.json` scripts memakai `bun`:
  ```json
  {
    "scripts": {
      "dev": "bunx tsx server.ts",
      "build": "next build",
      "start": "NODE_ENV=production bunx tsx server.ts",
      "lint": "next lint",
      "typecheck": "tsc --noEmit",
      "format": "prettier --write .",
      "db:generate": "bunx prisma generate",
      "db:migrate": "bunx prisma migrate dev",
      "db:deploy": "bunx prisma migrate deploy",
      "db:seed": "bunx tsx prisma/seed.ts",
      "db:studio": "bunx prisma studio",
      "prepare": "husky"
    }
  }
  ```

### 0.2 Prisma & Database
- [x] 0.2.1 Copy `schema.prisma` ke `prisma/schema.prisma` (dari root → `prisma/schema.prisma`).
- [x] 0.2.2 Tambahkan model tambahan yang dibutuhkan MVP:
  - `LeaderboardSnapshot` (cached ranking)
  - `Achievement` + `UserAchievement`
  - `Quest` + `UserQuest` (daily quests)
  - `PriceHistory` (historical price untuk chart)
  - `CreditScore` (1-1 dengan User)
  - `TutorialProgress` (1-1 dengan User)
  - `WatchedAsset` (watchlist, ditambahkan di Fase 6)
- [x] 0.2.3 Buat Prisma Client singleton di `lib/prisma.ts` (anti-hot-reload-leak pattern).
- [x] 0.2.3 Buat seed script `prisma/seed.ts`:
  - Seed user dummy (alice, charlie, dave).
  - Seed `MarketData` (10 saham, 5 crypto, 4 obligasi, 3 reksadana) + 30 hari PriceHistory.
  - Seed `GameEvent` awal (melalui tick engine).
  - Seed `Achievement` (9) + `Quest` (3) — ditambahkan Fase 9.
- [x] 0.2.4 Tambahkan `prisma.seed` config di `package.json` (sementara, lalu dipindah ke `prisma.config.ts`, lalu dihapus — Prisma 6 warning).
- [x] 0.2.5 Jalankan `bunx prisma migrate dev --name init` ⚠️ **(instruksi user untuk menjalankan)**.

### 0.3 Design System Foundation (Light Mode, Compact, Dimmed Palette)
- [x] 0.3.1 Definisikan CSS variables di `globals.css` — **light theme only** sesuai DESIGN.md v1.1:
  - `--bg-base: #F8FAFC`, `--bg-card: #FFFFFF`, `--border: #E2E8F0`
  - `--text: #0F172A`, `--text-muted: #64748B`
  - `--primary-deep-blue: #1E3A5F`, `--primary-steel-cyan: #3B82C4`
  - `--profit: #16A34A`, `--loss: #DC2626`
  - `--warning: #D97706`, `--info: #4F46E5`
- [x] 0.3.2 **Hapus** class `dark:` Tailwind & nilai `prefers-color-scheme`. **Tidak ada dark mode.**
- [x] 0.3.3 Aturan saturasi: warna aksen ≤ 70% saturasi, hindari pure neon.
- [x] 0.3.4 Konfigurasi font: **Inter** (sans, body 13-14px) + **JetBrains Mono** (mono, tabular-nums).
- [x] 0.3.5 **Compact spacing system** (base 4px): utility class `.card-compact` (12px pad).
- [x] 0.3.6 Tailwind v4 config (CSS-first via `@theme`).
- [x] 0.3.7 Buat komponen primitive custom:
  - `<Money>` (format mata uang + warna dinamis, font mono).
  - `<PercentChange>` (panah naik/turun, warna profit/loss).
  - `<StatCard>` (compact, label kecil + angka besar).
  - `<Input>`, `<Button>`, `<Field>` / `<FormCard>` — form primitives.
  - `<CandlestickChart>` (pure SVG, ~40 LOC).
- [x] 0.3.8 Setup **Framer Motion** variants — `config/motion.ts` (fadeIn, slideUp, scaleIn).

### 0.4 Environment Variables
- [x] 0.4.1 `.env.example` minimal berisi:
  ```
  DATABASE_URL=postgresql://finsim:finsim_dev_pwd@localhost:5432/finsim
  DIRECT_URL=                 # untuk migrasi
  NEXTAUTH_SECRET=            # signing key JWT session
  NEXTAUTH_URL=http://localhost:3002
  SOCKET_URL=http://localhost:3002
  NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
  NEXT_PUBLIC_APP_URL=http://localhost:3002
  TICK_INTERVAL_MS=10000
  PORT=3002
  START_TICKER_IN_DEV=0
  ```

### 0.5 Quality Gates
- [x] 0.5.1 Script `lint`, `typecheck`, `format`, `db:seed`, `db:studio` di `package.json`.
- [x] 0.5.2 Setup **husky** + **lint-staged** (pre-commit: lint + format).
- [x] 0.5.3 Buat `README.md` dengan instruksi setup lengkap pakai **Bun**.

**DoD Fase 0**: App bisa `bun run dev`, halaman tampil dengan tema **light** compact, Prisma client connect sukses, semua script jalan.
- [ ] 0.2.5 Tambahkan `prisma.seed` config di `package.json` dengan command `bunx tsx prisma/seed.ts`.
- [ ] 0.2.6 Jalankan `bunx prisma migrate dev --name init` ⚠️ **(instruksikan user, jangan auto-run)**.

### 0.3 Design System Foundation (Light Mode, Compact, Dimmed Palette)
- [ ] 0.3.1 Definisikan CSS variables di `globals.css` — **light theme only** sesuai DESIGN.md v1.1:
  - `--bg-base: #F8FAFC`, `--bg-card: #FFFFFF`, `--border: #E2E8F0`
  - `--text: #0F172A`, `--text-muted: #64748B`
  - `--primary-deep-blue: #1E3A5F`, `--primary-steel-cyan: #3B82C4`
  - `--profit: #16A34A`, `--loss: #DC2626`
  - `--warning: #D97706`, `--info: #4F46E5`
- [ ] 0.3.2 **Hapus** class `dark:` Tailwind & nilai `prefers-color-scheme`. **Tidak ada dark mode.**
- [ ] 0.3.3 Aturan saturasi: warna aksen ≤ 70% saturasi, hindari pure neon (`#00FF...`, `#FF0...`). Gunakan var CSS di atas saja.
- [ ] 0.3.4 Konfigurasi font: **Inter** (sans, body 13-14px) + **JetBrains Mono** (mono untuk angka finansial, tabular-nums).
- [ ] 0.3.5 **Compact spacing system** (base 4px): utility class `.px-card` (12px), `.py-card` (16px), `.gap-tight` (8px), `.gap-section` (16px). Hindari padding > 24px kecuali hero.
- [ ] 0.3.6 Tailwind config: perbesar density — `fontSize: { xs:'12px', sm:'13px', base:'14px', lg:'16px', xl:'20px' }`, `spacing` standar pakai 4px scale.
- [ ] 0.3.7 Buat komponen primitive custom:
  - `<Money>` (format mata uang + warna dinamis profit/loss, font mono).
  - `<PercentChange>` (panah naik/turun, warna profit/loss).
  - `<PriceChart>` (wrapper Recharts line/candlestick, warna mengikuti palette dimmed).
  - `<RiskMeter>` (gauge conservative → aggressive).
  - `<Sparkline>` (mini chart di hero).
  - `<StatCard>` (compact, label kecil + angka besar).
- [x] 0.3.8 Setup **Framer Motion** variants — `config/motion.ts` (fadeIn, slideUp, scaleIn) + `<CountUp>`.

### 0.4 Environment Variables
- [ ] 0.4.1 `.env.example` minimal berisi:
  ```
  DATABASE_URL=
  DIRECT_URL=             # untuk migrasi (Neon pooled vs direct)
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=
  SOCKET_URL=             # websocket server (bisa sama dengan app)
  TICK_INTERVAL_MS=       # default 10000 (10 detik)
  NEXT_PUBLIC_SOCKET_URL=
  NEXT_PUBLIC_APP_URL=
  ```

### 0.5 Quality Gates
- [ ] 0.5.1 Tambahkan script `lint`, `typecheck`, `format`, `db:seed`, `db:studio` di `package.json` (semua via `bun run ...` / `bunx`).
- [ ] 0.5.2 Setup **husky** + **lint-staged** (pre-commit: lint + typecheck). Pasang via `bunx husky init`.
- [ ] 0.5.3 Buat `README.md` dengan instruksi setup lengkap memakai **Bun** (`bun install`, `bun run dev`, dll).

**DoD Fase 0**: App bisa `bun run dev`, halaman kosong tampil dengan tema **light** compact, Prisma client connect sukses, semua script `bun run` jalan.

---

## FASE 1 — Domain Modeling & Game Config

### 1.1 Type Definitions
- [x] 1.1.1 Buat `types/index.ts` → export semua tipe hasil generate Prisma.
- [x] 1.1.2 Buat `types/game.ts` untuk domain DTO:
  - `MarketTickPayload`, `PortfolioSummary`, `LoanOffer`, `TradeOrder`, `BusinessStats`, `LeaderboardEntry`, `NotificationPayload`.
- [x] 1.1.3 Buat zod schemas untuk semua input API: `registerSchema`, `loginSchema`, `tradeSchema`, `loanSchema`, `businessSchema`.

### 1.2 Game Configuration (single source of truth)
- [x] 1.2.1 Buat `config/game.ts` berisi konstanta:
  - `STARTING_CASH = 0`
  - `DEFAULT_SALARY_PER_TICK`
  - `LIVING_EXPENSE_PER_TICK` + inflasi
  - `TICK_INTERVAL_MS`, `TICKS_PER_GAME_DAY`
  - `BANK_BASE_RATE`, `BANK_MAX_LOAN_MULTIPLIER` (terhadap net worth)
  - `LATE_PAYMENT_PENALTY_RATE`
  - `CREDIT_SCORE_DEFAULT = 700`
- [x] 1.2.2 Konfigurasi jenis aset di `config/assets.ts`:
  - Daftar symbol, nama, type, basePrice, volatility, trendFactor awal.
- [x] 1.2.3 Konfigurasi event di `config/events.ts` (5-10 jenis: resesi, boom, inflasi, crash sektor, bubble crypto, dll) — masing-masing dengan probabilitas, durasi, impactFactor per sektor.
- [x] 1.2.4 Konfigurasi jenis bisnis di `config/businesses.ts` (Cafe, TechStartup, Retail, Manufaktur, Property) dengan baseRevenue, baseExpense, maxLevel = 10.
- [x] 1.2.5 Konfigurasi achievement di `config/achievements.ts` (First Investment, First Million, Survive Recession, Diversified, Debt-Free, dll).

**DoD Fase 1**: Semua konstanta game terdefinisi di satu tempat, tidak ada magic number di kode bisnis.

---

## FASE 2 — Authentication & User Management (FR-01, FR-02, FR-03)

> **Catatan**: NextAuth v4 tidak kompatibel dengan Next 16 Route Handler body parsing. Auth di-roll pakai **jose JWT + bcryptjs** sebagai gantinya. ~80 LOC di `src/lib/auth.ts` + `auth-config.ts`.

### 2.1 Auth (JWT roll — menggantikan NextAuth)
- [x] 2.1.1 `src/lib/auth.ts` — JWT sign/verify (jose), hash/verify (bcryptjs), cookie helpers (set/clear).
- [x] 2.1.2 `src/lib/auth-config.ts` — pure constants (cookie name, TTL, secret) terpisah dari `next/headers`.
- [x] 2.1.3 `src/lib/session.ts` — `getSession()`, `getSessionFromRequest(req)`, `getUserId()` untuk SSR & route handlers.
- [x] 2.1.4 `src/proxy.ts` — middleware (Next 16 proxy convention) untuk protect route autentikasi.

### 2.2 Auth API
- [x] 2.2.1 `POST /api/auth/register` → validasi zod, hash password, create User + UserProfile + inisialisasi CreditScore + TutorialProgress, auto-set session cookie.
- [x] 2.2.2 `POST /api/auth/login` → verify password, set session cookie.
- [x] 2.2.3 `POST /api/auth/logout` → clear cookie.
- [ ] 2.2.4 Rate limiting pada auth endpoints (in-memory atau upstash redis) — *post-MVP*.

### 2.3 Profile
- [x] 2.3.1 `GET /api/profile` → data user + profile + risk profile.
- [x] 2.3.2 `PATCH /api/profile` → update avatar, bio, risk profile.
- [ ] 2.3.3 Session management: auto-logout setelah idle (configurable, default 30 menit).

### 2.4 Auth UI
- [x] 2.4.1 Halaman `/login` (form + link register).
- [x] 2.4.2 Halaman `/register` (username, email, password, konfirmasi).
- [x] 2.4.3 Redirect ke `/onboarding` setelah register pertama.
- [x] 2.4.4 Proteksi route via `proxy.ts` (Next 16 proxy convention) + server-side session check di layout.

**DoD Fase 2**: User bisa register, login, logout, session persist, route terproteksi redirect ke login.

---

## FASE 3 — Simulation Engine (FR-07, FR-08, FR-09, FR-10, FR-11) — **CORE**

### 3.1 Tick Scheduler
- [x] 3.1.1 Buat `server/engine/tick-scheduler.ts`:
  - Singleton, start saat server boot (atau lazy start saat ada client connect).
  - Interval configurable via `TICK_INTERVAL_MS`.
  - Pause / resume capability.
  - Logging setiap tick (mulai, selesai, durasi, error).
- [x] 3.1.2 Recovery: jika tick sebelumnya belum selesai, skip / queue dengan aman (mutex via `inTick` boolean).

### 3.2 Price Movement Algorithm
- [x] 3.2.1 Implementasi **Random Walk + volatility + macro trend** di `server/engine/price-engine.ts`:
  ```
  nextPrice = currentPrice * (1 + trendFactor * macroBias
              + volatility * gaussianRandom()
              + eventImpact)
  ```
- [x] 3.2.2 Gunakan **crypto-secure RNG** (`crypto.randomBytes`) untuk Gaussian (Box-Muller).
- [x] 3.2.3 Floor harga di nilai minimum (tidak negatif).
- [x] 3.2.4 Persist ke `MarketData` + push ke `PriceHistory` (untuk chart).
- [x] 3.2.5 Update `Asset.currentPrice` untuk semua holder (denormalized).

### 3.3 Event Engine
- [x] 3.3.1 `server/engine/event-engine.ts`:
  - Tiap N tick, roll event berdasarkan probabilitas.
  - Aktifkan `GameEvent` (startAt, endAt, impactFactor, sektor terdampak).
  - Expire otomatis saat endAt terlewati.
- [x] 3.3.2 Event mempengaruhi `trendFactor` & `volatility` sementara pada sektor terkait.

### 3.4 Financial Update per Tick
- [x] 3.4.1 **Salary** masuk untuk user dengan Employment aktif → update `cash`, push Transaction.
- [x] 3.4.2 **Business revenue/expense** → update `cash` pemilik.
- [x] 3.4.3 **Living expense** otomatis (biaya hidup + inflasi) → kurangi cash.
- [x] 3.4.4 **Loan interest accrual** tiap tick (proporsional `TICKS_PER_GAME_MONTH`).
- [x] 3.4.5 **Auto repayment** loan (cicilan otomatis tiap "bulan game").
- [x] 3.4.6 **Late penalty check** → turunkan credit score jika gagal bayar.
- [x] 3.4.7 **Recompute net worth** (cash + Σ asset value − Σ remaining loan).
- [x] 3.4.8 Semua operasi di **transaction DB (ACID)** per user.

### 3.5 Real-time Broadcast (Socket.io)
- [x] 3.5.1 Setup Socket.io server di custom Next.js server (`server.ts`) — single process.
- [x] 3.5.2 Auth middleware socket (verify JWT cookie via jose).
- [x] 3.5.3 Event emit:
  - `market:update` (array price snapshot).
  - `user:tick` (per user, room `user:{id}`).
  - `event:active` (broadcast global).
  - `notification:new` (per user).
- [x] 3.5.4 Client hook `useSocket()` dengan auto-reconnect.
- [x] 3.5.5 Throttling emit (batch update tiap tick, bukan per asset).

### 3.6 Game Time (Revised — Speed Control Dihapus)
- [x] 3.6.1 Speed control dihapus. Waktu game SAMA untuk semua pemain.
- [x] 3.6.2 **Game Time** dari 1 Jan 2018 00:00 UTC. 1 tick = 1 game menit. Tick interval 10s real-time.
- [x] 3.6.3 **Format display** `HH:MM` (tanpa detik). `formatGameTime()` berdasarkan GAME_START_DATE + tickNumber × 60s.
- [x] 3.6.4 **Market Hours** — saham hanya bisa ditransaksikan jam 20:00–03:00 game time. `isMarketOpen()` helper.
- [x] 3.6.5 **Client-side clock**: `<GameTime>` polling `/api/simulation/speed` setiap 10 detik.

### 3.7 Persistence & Recovery
- [x] 3.7.1 `SimulationState` model — 1 baris (id=1) menyimpan `tickNumber`.
- [x] 3.7.2 Tiap tick: upsert `tickNumber` ke `simulation_state`.
- [x] 3.7.3 `startTicker()` async: baca `simulation_state` dari DB, restore tickNumber.
- [x] 3.7.4 Crash recovery: worst-case kehilangan 1 tick (10 detik).

**DoD Fase 3**: Saat server jalan, harga market berubah tiap tick, client konek socket menerima update real-time, net worth user ter-update otomatis, salary & loan interest berjalan.

---

## FASE 4 — Core Layout & Navigation

### 4.1 App Shell
- [x] 4.1.1 `(app)` route group — layout wrapping Sidebar + TopBar + BottomNav + FAB + keyboard shortcuts + Toaster.
- [x] 4.1.2 `<Sidebar>` (desktop, kiri) — item: Dashboard, Market, Portfolio, Business, Lending, Leaderboard, History. (DESIGN §2)
- [x] 4.1.3 `<BottomNav>` (mobile) — versi compact dengan 5 item utama (Dashboard, Market, Bisnis, Pinjaman, Ranking).
- [x] 4.1.4 `<TopBar>`:
  - Net Worth besar + % change (real-time via socket `user:tick`).
  - **Game Time**: "Day N — date" (bersamaan dengan speed control).
  - Speed Control (tombol 1x/4x/24x + pause).
  - Notification bell (dengan badge unread count).
  - Profile avatar (dropdown: settings, logout).
- [x] 4.1.5 Responsive breakpoint: sidebar collapse (hidden < md) → bottom nav muncul.
- [x] 4.1.6 Keyboard shortcuts: `D` Dashboard, `M` Market, `P` Portfolio, `B` Business, `L` Lending, `K` Leaderboard, `H` History.

### 4.2 Notification Center
- [x] 4.2.1 Drawer/popover dari bell icon.
- [x] 4.2.2 List notification real-time via socket event `notification:new`.
- [x] 4.2.3 `PATCH /api/notifications/:id/read` + bulk mark all read.
- [x] 4.2.4 Auto-dismiss toast untuk notifikasi penting (via sonner).

### 4.3 Floating Action Button (FAB)
- [x] 4.3.1 FAB mobile (`+`) → expand ke: Beli Aset, Mulai Bisnis, Ambil Pinjaman, Cari Kerja (dengan "soon" badge).
- [x] 4.3.2 Desktop: quick actions di sidebar kanan (belum diimplementasi — YAGNI MVP).

### 4.4 Pause Overlay
- [x] 4.4.1 Non-dismissible full-screen modal saat simulation paused.
- [x] 4.4.2 Hanya bisa ditutup via tombol Resume (klik luar / Escape tidak berfungsi).
- [x] 4.4.3 Polling `GET /api/simulation/speed` tiap 2 detik untuk cek paused state.

**DoD Fase 4**: Navigasi lengkap, top bar menampilkan net worth real-time, notifikasi push dari server bekerja.

---

## FASE 5 — Dashboard (FR-26) — **Central Hub**

### 5.1 Hero Section
- [x] 5.1.1 **Net Worth card** besar dengan sparkline area chart (30 hari via running balance dari transactions).
- [x] 5.1.2 **Sparkline 30 hari** (dari transactions → running balance per day).
- [x] 5.1.3 Quick stats: Net Worth, Cash, Total Assets, Total Debt (server-rendered).
- [x] 5.1.4 Animasi **count-up** pada angka — `<CountUp>` + `<AnimatedMoney>` via Framer Motion `animate()`.

### 5.2 Middle Section
- [x] 5.2.1 **Asset Allocation Pie Chart** (Recharts PieChart, color blind friendly, legend per type, empty state + CTA).
- [x] 5.2.2 **Cash Flow Bar Chart** (toggle mingguan/bulanan, per-bar green/red coloring).
- [x] 5.2.3 Empty state: ilustrasi + CTA "Mulai investasi pertamamu" di allocation pie.

### 5.3 Right Sidebar / Collapsible
- [x] 5.3.1 **Active Loans** card list (overdue highlight).
- [x] 5.3.2 **Upcoming Events / Random News** feed (event feed dengan ikon per tipe).
- [x] 5.3.3 **Quick Actions** panel (FAB di mobile).

### 5.4 API
- [x] 5.4.1 `GET /api/dashboard` → aggregasi: net worth series, allocation, cashflow, loans active, upcoming events.
- [x] 5.4.2 Cache response per user (revalidate tiap tick — via `no-store` header + SSR langsung dari Prisma).

**DoD Fase 5**: Dashboard render semua data, update real-time via socket, mobile stack vertical.

---

## FASE 6 — Market & Investment (FR-12, FR-13, FR-14, FR-11)

### 6.1 Market List Page
- [x] 6.1.1 Tabs: All / Stocks / Crypto / Bonds / Funds (PROPERTY di MVP optional).
- [x] 6.1.2 Search bar (debounced, by symbol/nama).
- [x] 6.1.3 Filter: watchlist filter toggle (Watched Only).
- [x] 6.1.4 Sort: name / price / % change (cyclic toggle).
- [x] 6.1.5 Card per aset: symbol, tipe label, price (live), % change (warna dinamis), volatility.
- [x] 6.1.6 Real-time price update via socket (subscribe `market:update`, state merge tanpa re-render penuh).

### 6.2 Asset Detail Modal / Page
- [x] 6.2.1 Large price chart (line chart default) + **candlestick chart** (toggle Garis↔Candlestick).
- [x] 6.2.2 Timeframe selector: 1W / 1M / 3M.
- [x] 6.2.3 Buy/Sell panel:
  - Quantity stepper (−/+ buttons + input).
  - Estimated total (≈ Money).
  - Beli / Jual buttons dengan confirmation via toast.
- [x] 6.2.4 Fundamental info fiktif + **Risk Meter** per aset — *post-MVP*.
- [x] 6.2.5 "Watch" / favorite button (toggle star, persist via `/api/watchlist`).

### 6.3 Trade Engine
- [x] 6.3.1 `POST /api/trade/buy` → validasi saldo, ACID transaction:
  - Update/create `Asset` (weighted average price).
  - Kurangi cash.
  - Push Transaction type=BUY.
  - Panggil `recordTrade(symbol, +quantity)` untuk volume impact.
- [x] 6.3.2 `POST /api/trade/sell` → validasi quantity, ACID:
  - Update/hapus `Asset`.
  - Tambah cash.
  - Push Transaction type=SELL.
  - Panggil `recordTrade(symbol, -quantity)` untuk volume impact.
- [x] 6.3.3 Anti-cheat: server-authoritative, validasi harga pakai `MarketData.currentPrice` (bukan input client).
- [x] 6.3.4 Rate limiting per user (max N trade per tick) — `src/lib/rate-limiter.ts`, Map per-user per-tick.
- [x] 6.3.5 **Volume Impact** — `price-engine.ts`: `recordTrade()` & `consumeVolume()`. Net volume per simbol per tick mempengaruhi harga (VOLUME_WEIGHT = 0.0001).
- [x] 6.3.6 **Limit Order** — `POST /api/trade/limit` buat order dengan `{ symbol, type, quantity, limitPrice }`.
- [x] 6.3.7 `GET /api/trade/orders` — list semua order user (semua status).
- [x] 6.3.8 `DELETE /api/trade/orders/[id]` — cancel order PENDING.
- [x] 6.3.9 **Limit Order Engine** — `limit-order-engine.ts`: tiap tick, scan PENDING orders, execute jika harga cocok (`buy: price <= limit`, `sell: price >= limit`). Notifikasi via socket. Panggil `recordTrade()` saat eksekusi.

### 6.4 Portfolio Page (FR-14)
- [x] 6.4.1 Grid card per aset dimiliki.
- [x] 6.4.2 Sort: value, P/L, allocation %.
- [x] 6.4.3 Performance summary: total invested, current value, unrealized P/L.
- [x] 6.4.4 **Drag & drop rebalance** — *YAGNI MVP*.
- [x] 6.4.5 Empty state + CTA "Mulai investasi".

**DoD Fase 6**: User bisa browse market, buy/sell dengan validasi, portfolio update real-time, P/L terhitung.

---

## FASE 7 — Business Management (FR-15, FR-16, FR-17)

### 7.1 Business API
- [x] 7.1.1 `POST /api/business` → create business (biaya setup potong cash).
- [x] 7.1.2 `POST /api/business/:id?action=upgrade` → naikkan level (biaya eksponensial), update revenue/expense.
- [x] 7.1.3 `POST /api/business/:id?action=hire` → tambah employee, naikkan expense.
- [x] 7.1.4 `POST /api/business/:id?action=fire`.
- [x] 7.1.5 `POST /api/business/:id?action=liquidate` → likuidasi (refund 40%).

### 7.2 Business UI
- [x] 7.2.1 List bisnis user (multi-business, grid cards).
- [x] 7.2.2 Detail view per bisnis:
  - Level progress bar (Lv.1-10).
  - Revenue/Expense/Profit display per tick.
  - Employee count + salary info.
  - Upgrade button dengan preview cost.
- [x] 7.2.3 Form create business: pilih jenis (dari config), nama, preview cost & revenue.

### 7.3 Tick Integration
- [x] 7.3.1 Revenue/expense otomatis masuk per tick via `financial-tick.ts`.
- [x] 7.3.2 **Business Volatility** — tiap tipe bisnis punya `volatility` (config/businesses.ts). Revenue aktual = `baseRevenue × (1 + volatility × gaussian())`. Expense tetap. Bisa rugi di tick tertentu.
- [x] 7.3.3 **Experience** — `business.createdAtTick` dicatat saat buat bisnis. Setiap 1 game-month, volatilitas turun 1% (max 5%). Property dikecualikan.

**DoD Fase 7**: User bisa buat, upgrade, hire/fire, dan lihat performa bisnis; cash flow update tiap tick.

---

## FASE 8 — Lending System (FR-18, FR-19, FR-20, FR-21, FR-22)

> **Catatan**: `Loan.borrowerId` dan `dueDate` diubah jadi opsional (?) untuk mendukung PENDING offers. Enum `LoanStatus` ditambah `PENDING`.

### 8.1 Peer-to-Peer Lending API
- [x] 8.1.1 `POST /api/loans` → buat tawaran pinjaman (amount, rate, tenor) → status PENDING.
- [x] 8.1.2 `GET /api/loans?list=offers` → marketplace listing (semua PENDING, exclude punya sendiri).
- [x] 8.1.3 `POST /api/loans/:id/accept` → borrower accept → ACID transfer cash lender→borrower, status ACTIVE, set dueDate.
- [x] 8.1.4 `GET /api/loans?list=mine` → loansGiven (dengan borrower username) + loansTaken (dengan lender username).

### 8.2 Bank NPC Lending (FR-20)
- [x] 8.2.1 `GET /api/bank` → hitung max loan berbasis credit score & net worth.
- [x] 8.2.2 `POST /api/bank` → instant approve (dalam limit), rate tetap 1%/bln dari config.

### 8.3 Repayment & Default (FR-21)
- [x] 8.3.1 Auto repayment tiap "bulan game" (Fase 3.4.5) → installment = (amount × (1+rate)) / tenor.
- [x] 8.3.2 Jika cash < cicilan → late penalty (5%), credit score turun (-25).
- [x] 8.3.3 Jika telat > 3 bulan → status DEFAULTED (atau langsung jika remaining ≤ 0.01 → PAID).
- [x] 8.3.4 Notifikasi: H-3, H-1, H-0 jatuh tempo — query overdue loans per tick, create + socket emit.

### 8.4 Lending Marketplace UI (DESIGN §3)
- [x] 8.4.1 Tabs: Marketplace / Pinjamanku / Bank.
- [x] 8.4.2 Card pinjaman: amount, interest, tenor, counterparty name, status badge.
- [x] 8.4.3 Form buat pinjaman: input amount/rate/tenor + preview cicilan.
- [x] 8.4.4 Accept button dengan konfirmasi via toast.
- [x] 8.4.5 Detail view: status, jatuh tempo.

### 8.5 Notifications (FR-22)
- [x] 8.5.1 Emit notifikasi real-time via socket: `notification:new` saat late penalty (dari financial-tick).

**DoD Fase 8**: Pinjaman antar player & bank berfungsi end-to-end, cicilan otomatis, credit score update, notifikasi terkirim.

---

## FASE 9 — Gamification (FR-23, FR-24, FR-25)

### 9.1 Leaderboard (FR-23)
- [x] 9.1.1 Snapshot periodik (tiap 5 tick) → `LeaderboardSnapshot` + in-memory cache.
- [x] 9.1.2 `GET /api/leaderboard` → ranked list + current user's rank.
- [x] 9.1.3 Cache in-memory LRU (recompute tiap 5 tick).
- [x] 9.1.4 UI: ranked list dengan rank, username, net worth, top-3 styling (#1 gold).
- [ ] 9.1.5 Filter: Global / Friends / This Week / By Risk Profile — *ALL_TIME only*.
- [ ] 9.1.6 Click user → public profile — *post-MVP*.

### 9.2 Achievements (FR-24)
- [x] 9.2.1 Engine evaluasi achievement tiap tick di `server/engine/achievements.ts`.
- [x] 9.2.2 Cek kondisi: FIRST_TRADE, FIRST_MILLION, SURVIVE_RECESSION, DIVERSIFIED, DEBT_FREE, BUSINESS_OWNER, CRYPTO_INVESTOR, BORROWER, LENDER.
- [x] 9.2.3 Award: create `UserAchievement`, emit notifikasi `notification:new` via socket.
- [x] 9.2.4 UI: gallery badges (locked/unlocked) di tab Pencapaian pada halaman leaderboard.

### 9.3 Daily Quests (FR-25)
- [x] 9.3.1 Model + seed siap (3 quests: DAILY_TRADE, DAILY_LOGIN, DAILY_BUSINESS_PROFIT).
- [x] 9.3.2 Contoh quest sudah di seed.
- [x] 9.3.3 Model `UserQuest` + relasi siap.
- [x] 9.3.4 Reward cash sudah di seed config.
- [x] 9.3.5 UI: panel quest di dashboard — `<DailyQuests>` component + `GET /api/quests`.
- [x] 9.3.5b Engine quest harian — model `UserQuest` + status tracking per user per hari.

**DoD Fase 9**: Leaderboard live, achievement unlock dengan feedback visual.

---

## FASE 10 — Onboarding Tutorial (FR-04, FR-05, FR-06)

> **Catatan**: Tutorial dibangun tanpa library tambahan — overlay modal + progress dots + action buttons. Total ~150 LOC.

### 10.1 Tutorial Engine
- [x] 10.1.1 Tanpa library — custom overlay component `TutorialGuide`.
- [x] 10.1.2 Step sequence:
  1. Welcome → "Lihat Dashboard"
  2. "Pahami Net Worth" → Oke
  3. "Investasi pertama" → Buka Market
  4. "Mulai bisnis kecil" → Buka Bisnis
  5. "Pinjam uang" → Buka Pinjaman
  Done → "Siap Bermain!"
- [x] 10.1.3 Overlay + progress dots + action buttons.
- [x] 10.1.4 Tombol **Skip** kapan saja → simpan progress.
- [x] 10.1.5 Bisa di-repeat via Settings (tinggal PATCH `completed=false`).

### 10.2 Educational Tooltips
- [x] 10.2.1 Contextual tooltip saat aksi pertama — `dismissTooltip` API.
- [x] 10.2.2 Flag "Don't show again" — simpan di `TutorialProgress.dismissedTooltips`.

### 10.3 Persistence
- [x] 10.3.1 `TutorialProgress` track step + completeds + skipped + dismissedTooltips.
- [x] 10.3.2 `PATCH /api/tutorial` update step / mark completed / skip / dismiss tooltip.

**DoD Fase 10**: User baru bisa menjalani tutorial, skip, dan repeat; progress tersimpan.

---

## FASE 11 — History & Reports (FR-27, FR-28)

### 11.1 Transaction History (FR-27)
- [x] 11.1.1 `GET /api/transactions?cursor=&type=&from=&to=` dengan pagination cursor-based (UUID cursor, `take` parameter).
- [x] 11.1.2 Filter by type (dropdown: BUY, SELL, SALARY, EXPENSE, dll) & date range (from/to).
- [x] 11.1.3 UI: tabel dengan virtualisasi — *YAGNI MVP, <100 txn/page* (tabel biasa, scroll container max-h).
- [x] 11.1.4 Export CSV (`?csv=1` → `text/csv` attachment, tanpa library).

### 11.2 Reports (FR-28)
- [x] 11.2.1 `GET /api/reports?year=&month=` → income vs expense breakdown per category.
- [x] 11.2.2 `GET /api/reports?year=` — yearly via month param.
- [x] 11.2.3 UI: halaman `/reports` — bar chart per kategori + summary cards income/expense/net + sidebar link.
- [ ] 11.2.4 Export PDF — *post-MVP*.

**DoD Fase 11**: User bisa lihat histori transaksi, filter & export CSV.

---

## FASE 12 — PWA, Performance, Security & Polish

### 12.1 PWA
- [x] 12.1.1 Manual manifest (`public/manifest.json`).
- [x] 12.1.2 `manifest.json` + icon (`icon.svg`).
- [x] 12.1.3 Service worker basic cache (`public/sw.js`) + register via `<PwaRegister>`.
- [x] 12.1.4 Install prompt (beforeinstallprompt) — *post-MVP*.

### 12.2 Performance
- [x] 12.2.1 Code splitting per route (Next.js App Router bawaan).
- [x] 12.2.2 `React.memo` pada `TickerCell` di market ticker.
- [x] 12.2.3 Database indexes on hot columns — script `prisma/add-indexes.ts`.
- [ ] 12.2.4 Lighthouse pass — *post-MVP*.
- [x] 12.2.5 Skeleton loading component (`<Skeleton>`, `<SkeletonCard>`, `<SkeletonRow>`).

### 12.3 Security
- [x] 12.3.1 **Server-authoritative** semua transaksi (validasi harga dari `MarketData.currentPrice`).
- [x] 12.3.2 Parameterized query (Prisma default).
- [x] 12.3.3 Rate limiting per-endpoint (trade: `rate-limiter.ts`).
- [x] 12.3.4 CSRF protection (session-based JWT, tidak ada form tradisional).
- [x] 12.3.5 Sanitize & escape (zod + React auto-escape).
- [x] 12.3.6 Security headers via `next.config.ts` (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- [x] 12.3.7 Secret rotation — env var `NEXTAUTH_SECRET`.
- [ ] 12.3.8 Audit anti-cheat log — *post-MVP*.

### 12.4 Accessibility (DESIGN §6)
- [x] 12.4.1 ARIA labels pada interactive elements (close buttons, speed control, watch toggle, dll).
- [x] 12.4.2 Keyboard shortcuts global (`useKeyboardShortcuts` — D/M/P/B/L/K/H/R).
- [x] 12.4.3 Kontras WCAG AA (light theme, verifikasi manual).
- [x] 12.4.4 Font size scalable — `<FontSizeToggle>` (compact/normal/large).
- [x] 12.4.5 Color blind friendly chart patterns — Wong (2011) palette di AllocationPie, CandlestickChart.

### 12.5 Micro-interactions & Polish (DESIGN §7)
- [x] 12.5.1 Count-up animation — `<CountUp>` + `<AnimatedMoney>` via Framer Motion `animate()`.
- [x] 12.5.2 Smooth modal — `motion.div` dengan scale+fade (Framer Motion) di MarketModal.
- [ ] 12.5.3 Confetti on milestone — *YAGNI MVP*.
- [ ] 12.5.4 Pull-to-refresh mobile — *YAGNI MVP*.
- [x] 12.5.5 Loading skeleton — `<Skeleton>` ready untuk digunakan di fetch mana pun.

### 12.6 Observability
- [ ] 12.6.1 Structured logging — *skip, pino heavy untuk MVP* (console.log cukup).
- [ ] 12.6.2 Error tracking (Sentry) — *post-MVP*.
- [x] 12.6.3 Metrics dasar — tick duration log via `lastDurationMs` di tick state.

**DoD Fase 12**: App siap deploy, security headers terpasang, PMA manifest siap.

---

## FASE 13 — Deployment & Launch

- [ ] 13.1 Setup Neon PostgreSQL project → set `DATABASE_URL`.
- [ ] 13.2 Run `bunx prisma migrate deploy` di CI / Vercel build hook. ⚠️ **instruksikan user**.
- [ ] 13.3 Set semua env var di Vercel.
- [ ] 13.4 Deploy ke Vercel (preview → production). Vercel mendukung Bun sebagai runtime/build; set **Install Command** = `bun install` dan **Build Command** = `bun run build`.
- [ ] 13.5 Socket.io: gunakan Vercel compatible adapter (Redis adapter jika multi-instance) atau deploy socket server terpisah (Railway/Fly.io).
- [ ] 13.6 Smoke test production: register → tutorial → trade → loan → leaderboard.
- [ ] 13.7 Setup cron job untuk daily quest reset (Vercel Cron atau external).
- [ ] 13.8 Backup database strategi (Neon automated).

**DoD Fase 13**: App live di production, smoke test pass.

---

## FASE 14 — Success Metrics Tracking (PRD §7)

- [x] 14.1 Instrumentasi analytics — lightweight `src/lib/analytics.ts` (console.log dev, fetch ke `/api/analytics` di prod) + `GET/POST /api/analytics` endpoint.
- [x] 14.2 Event tracking: register (`[event] register`), first_trade (`[event] buy`), tutorial_complete (`[event] tutorial_complete`).
- [ ] 14.3 Dashboard metrik: DAU/MAU, retention — *post-MVP, perlu dashboard admin*.
- [x] 14.4 Survey in-game feedback — `POST /api/feedback` endpoint logging rating + message.

---

## APPENDIX A — API Endpoint Summary

| Method | Endpoint | Fungsi | FR |
|---|---|---|---|
| POST | `/api/auth/register` | Registrasi | FR-01 |
| POST | `/api/auth/login` | Login (NextAuth) | FR-01 |
| GET | `/api/profile` | Profil user | FR-02 |
| PATCH | `/api/profile` | Update profil | FR-02 |
| GET | `/api/dashboard` | Agregasi dashboard | FR-26 |
| GET | `/api/market` | List aset | FR-12 |
| GET | `/api/market/:symbol` | Detail aset + history | FR-12 |
| POST | `/api/trade/buy` | Beli aset | FR-13 |
| POST | `/api/trade/sell` | Jual aset | FR-13 |
| GET | `/api/portfolio` | Portfolio user | FR-14 |
| POST | `/api/business` | Buat bisnis | FR-15 |
| POST | `/api/business/:id/upgrade` | Upgrade | FR-15 |
| POST | `/api/business/:id/hire` | Hire | FR-17 |
| POST | `/api/business/:id/fire` | Fire | FR-17 |
| DELETE | `/api/business/:id` | Likuidasi | FR-15 |
| POST | `/api/loans/offer` | Buat tawaran | FR-18 |
| GET | `/api/loans/offers` | Marketplace | FR-19 |
| POST | `/api/loans/:id/accept` | Accept | FR-19 |
| GET | `/api/loans/mine` | Pinjaman saya | FR-19 |
| GET | `/api/bank/offer` | Tawaran bank | FR-20 |
| POST | `/api/bank/loan` | Ambil bank loan | FR-20 |
| GET | `/api/leaderboard` | Ranking | FR-23 |
| GET | `/api/achievements` | Achievement list | FR-24 |
| GET | `/api/quests` | Daily quests | FR-25 |
| GET | `/api/transactions` | Histori | FR-27 |
| GET | `/api/reports/monthly` | Laporan bulanan | FR-28 |
| GET | `/api/reports/yearly` | Laporan tahunan | FR-28 |
| GET | `/api/notifications` | List notif | FR-22 |
| PATCH | `/api/notifications/:id/read` | Tandai dibaca | FR-22 |
| PATCH | `/api/tutorial` | Update tutorial | FR-06 |
| WS | `market:update` | Broadcast harga | FR-11 |
| WS | `user:networth` | Update net worth | FR-26 |
| WS | `event:new` | Event broadcast | FR-09 |
| WS | `notification:new` | Notif real-time | FR-22 |

---

## APPENDIX B — FR → Fase Mapping

| FR | Deskripsi | Fase |
|---|---|---|
| FR-01 | Register/login | 2 |
| FR-02 | Profil & histori | 2 |
| FR-03 | Session & logout | 2 |
| FR-04 | Tutorial arrow pointer | 10 |
| FR-05 | Step-by-step guidance | 10 |
| FR-06 | Skip & repeat tutorial | 10 |
| FR-07 | Tick scheduler | 3 |
| FR-08 | Random price generator | 3 |
| FR-09 | Random events | 3 |
| FR-10 | Update net worth/cashflow/loan tiap tick | 3 |
| FR-11 | Real-time broadcast | 3 |
| FR-12 | Market page filter+search | 6 |
| FR-13 | Buy/sell + validasi saldo | 6 |
| FR-14 | Portfolio tracking P/L | 6 |
| FR-15 | Create/upgrade bisnis | 7 |
| FR-16 | Revenue/expense per tick | 3,7 |
| FR-17 | Hire/fire employee | 7 |
| FR-18 | Buat pinjaman | 8 |
| FR-19 | Browse & accept P2P | 8 |
| FR-20 | Bank NPC + credit score | 8 |
| FR-21 | Auto repayment + penalty | 8 |
| FR-22 | Notifikasi real-time | 4,8 |
| FR-23 | Leaderboard | 9 |
| FR-24 | Achievement | 9 |
| FR-25 | Daily quests | 9 |
| FR-26 | Real-time dashboard | 5 |
| FR-27 | Transaction history | 11 |
| FR-28 | Monthly/yearly report | 11 |

---

## APPENDIX C — Catatan Penting

1. **Ponytail principle**: Setiap fase, tanya "apa minimal yang works?". Hindari abstraksi premature.
2. **Server-authoritative**: Client hanya request, server yang hitung. Tidak ada logic finansial di client selain preview.
3. **ACID wajib**: Semua transaksi finansial pakai `prisma.$transaction()`.
4. **No magic number**: Semua angka di config/game.ts.
5. **Error eksplisit**: Tidak ada silent fail. Log + user-friendly message.
6. **Migrasi**: ⚠️ Selalu instruksikan user menjalankan, jangan auto-run.

---

**Status**: Siap dieksekusi. Mulai dari **Fase 0**.
