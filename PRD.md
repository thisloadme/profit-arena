# Product Requirements Document (PRD)
**Game: Financial Simulation Arena** (Nama sementara)

**Version**: 1.0 (MVP)
**Date**: Juli 2026
**Target Audience**: Remaja hingga dewasa (16-35 tahun) yang ingin belajar literasi keuangan secara menyenangkan.
**Language**: English (global audience). Semua teks UI, error messages, dan konten game dalam English.

## 1. Vision & Objective
Membangun game simulasi finansial multiplayer berbasis web (PWA) di mana pemain mulai dari modal 0, mengelola keuangan pribadi, bisnis, investasi, dan pinjaman dalam dunia fiktif. Tujuannya adalah memberikan pengalaman belajar finansial yang realistis, adiktif, dan aman tanpa risiko uang sungguhan.

**Key Goals**:
- Edukasi finansial melalui gameplay (experiential learning).
- High replayability melalui randomisasi harga dan event.
- Kompetisi sehat via leaderboard.
- Deep simulation tanpa batas waktu.

## 2. Platform & Tech Stack
- **Platform**: Web (responsive) + PWA untuk mobile.
- **Frontend**: Next.js 14+ (App Router), TypeScript, TailwindCSS, shadcn/ui, Recharts (chart).
- **Backend**: Next.js API Routes atau NestJS.
- **Database**: PostgreSQL + Prisma ORM.
- **Real-time**: Socket.io.
- **Auth**: NextAuth.js / Clerk.
- **Deployment**: Vercel + Neon/PostgreSQL.

## 3. Core Features (MVP)

### A. Project Structure & Setup
- Monorepo Next.js.
- Folder structure standar (app/, components/, lib/, prisma/, etc).
- Environment variables untuk konfigurasi (DB, JWT, dll).
- Socket.io server untuk tick simulation dan real-time update.
- Basic authentication + profile.

### B. Market Simulation Engine
- **Tick System**: Setiap X detik (configurable), update semua harga aset.
- **Random Price Movement**:
  - Random walk + volatility per aset.
  - Macro trend (bull/bear cycle).
  - Random events (resesi, boom, inflasi, berita).
- Asset types: Saham, Crypto, Obligasi, Reksadana, Properti.
- Update real-time ke semua client yang online.
- Historical price data untuk chart.

### C. UI/UX Design
**Main Screens**:
1. **Landing Page** (unauthenticated `/`):
   - Animated one-page (100vh, no scroll).
   - Hero: brand + tagline + CTA (Get Started / Sign In).
   - Feature highlights (market, business, lending, portfolio).
   - Framer Motion staggered entry animations.
2. **Onboarding** (lihat section E).
3. **Dashboard**:
   - Net Worth card + growth chart.
   - Cash balance.
   - Asset Allocation (pie chart).
   - Quick actions (Invest, Business, Borrow, Work).
3. **Market Page**:
   - Tabbed: Stocks, Crypto, Bonds, Funds.
   - Searchable list dengan price, change %, volume.
   - Detail page per aset (chart, info, buy/sell).
4. **Portfolio**:
   - List semua aset yang dimiliki.
   - Performance tracking.
5. **Business Management**.
6. **Lending Marketplace**.
7. **Leaderboard** (Global, Friends, Weekly).
8. **History & Reports**.

**Design Principles**:
- Dark mode friendly (fintech feel).
- Clean, modern, mobile-first.
- Real-time updates dengan animasi halus.
- Tutorial overlays dengan panah.

### D. Lending & Debt System
- **Peminjaman antar Player**:
  - Buat tawaran pinjaman (amount, interest rate, tenor).
  - Marketplace pinjaman (bisa di-browse oleh player lain).
- **Bank NPC**:
  - Pinjaman dengan rate tetap + persyaratan (credit score sederhana).
  - Cicilan otomatis tiap tick.
- **Mechanics**:
  - Default jika tidak bayar → penalti, credit score turun.
  - Lender dapat bunga + notifikasi.
  - Kontrak digital sederhana.

### E. Onboarding Tutorial
- **Flow**:
  1. Register → Welcome screen.
  2. Interactive tutorial dengan arrow pointers ke elemen UI.
  3. Step-by-step:
     - Pahami Net Worth.
     - Dapatkan income pertama (kerja).
     - Lakukan investasi pertama.
     - Mulai bisnis kecil.
     - Pinjam uang.
  - Bisa di-skip kapan saja.
  - Progress saved, bisa di-repeat di Settings.
- Tooltips edukasi muncul pada aksi pertama (contoh: "Diversifikasi mengurangi risiko...").

## 4. Game Mechanics Detail

### Simulation Rules
- **Starting Condition**: Cash = 0, semua aset = 0.
- **Income**:
  - Gaji korporasi (stabil + kenaikan karir).
  - Profit bisnis (dikelola player).
- **Expense**: Biaya hidup bulanan + inflasi.
- **Time**: Unlimited. 1 tick real-time ≈ 1 hari game. Bisa di-accelerate.
- **Random Events**: 5-10 jenis event dengan probabilitas berbeda.

### Gamification
- Leaderboard berdasarkan Net Worth.
- Achievements.
- Daily/Weekly quests.
- Risk profile (mempengaruhi event dan kesempatan).

### Economy Balance
- Anti-inflation mechanism.
- Supply-demand sederhana antar player (marketplace lending & bisnis).

## 5. Non-Functional Requirements
- **Performance**: Update harga lancar untuk ratusan user.
- **Security**: Transaksi aman, rate limiting, anti-cheat untuk simulation.
- **Scalability**: Siap horizontal scaling.
- **Accessibility**: PWA offline-capable (basic cache).
- **Data Privacy**: Sesuai GDPR-like.

## 6. Future Roadmap (Post-MVP)
- Guilds & social features.
- Advanced business simulation (hire player, competition).
- Properti & virtual real estate.
- Mobile native (React Native wrapper).
- AI financial advisor dalam game.
- Export report ke PDF.

## 7. Success Metrics
- User retention (DAU/MAU).
- Average playtime per session.
- % user yang menyelesaikan tutorial.
- Feedback kualitas edukasi (survey in-game).

