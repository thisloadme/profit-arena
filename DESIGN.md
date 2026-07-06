# DESIGN.md - UI/UX Guidelines
**Game: Financial Simulation Arena**

**Version**: 1.1  
**Date**: Juli 2026  
**Philosophy**: "Powerful yet approachable" — UI harus terasa seperti dashboard finansial profesional tapi tetap fun, gamified, dan tidak overwhelming untuk pemula.

> **Update v1.1**: Light mode only (tidak ada dark mode), layout compact dengan whitespace yang dimanfaatkan untuk konten simulasi (banyak info per layar tanpa redeye), palet warna dimmed/profesional (tidak ngejreng).

---

## 1. Design Principles

### Core Values
- **Interaktif & Real-time**: Setiap perubahan terasa langsung (animasi halus).
- **Educational**: Tooltips, highlights, dan micro-explanations muncul secara kontekstual.
- **Tidak Generic**: Tema "Modern Finance Hub" — light, profesional, card-based dengan border tipis, elemen gamification (progress bars, badges, confetti pada milestone).
- **Compact & Information-Dense**: Whitespace digunakan strategis untuk konten game (chart, tabel, stats), bukan padding berlebih. Layout dense tapi tetap scannable.
- **Ease of Simulation**: Kontrol cepat untuk accelerate time, quick actions, glanceable metrics.
- **Mobile-First**: Semua layar dioptimalkan untuk HP (PWA).

### Color Scheme (Dimmed, Profesional — TIDAK ngejreng)
- **Primary**: Deep Blue (#1E3A5F) & Steel Cyan (#3B82C4) — lebih soft, bukan neon.
- **Accent**: Green (profit) #16A34A, Red (loss) #DC2626 — warna finansial solid tapi tidak saturated berlebih.
- **Neutral (Light Theme)**: background (#F8FAFC), surface/card (#FFFFFF), border (#E2E8F0), text utama (#0F172A), text muted (#64748B).
- **Warning/Info**: Amber (#D97706) & Indigo (#4F46E5) — digunakan sebagai accent halus, hindari gradient mencolok.
- **Aturan warna**: saturasi maksimal ~70%, hindari pure #FF / #00FF, kontras cukup untuk readability (WCAG AA).

### Density & Spacing
- **Base spacing unit**: 4px. Gunakan 8/12/16/24 untuk padding card — jangan 32+ kecuali hero.
- **Card padding**: 12-16px (bukan 24+). Padding kompak = lebih banyak konten per viewport.
- **Gap antar elemen**: 8-12px default. 16px hanya untuk pemisah section besar.
- **Font size**: body 13-14px (bukan 16), heading tight (h1=20px, h2=16px, h3=14px). Numbers mono 13-15px.
- **Tabel & list**: row height 36-40px, padat tapi tap-friendly di mobile.

### Typography
- Heading: Inter / Satoshi (bold)
- Body: Inter (13-14px compact)
- Numbers: Mono font, JetBrains Mono (untuk nilai finansial, tabular-nums)

---

## 2. Layout Utama (Desktop & Mobile)

### Global Navigation
- **Sidebar kiri** (Desktop) / **Bottom Nav** (Mobile):
  - Dashboard (Home)
  - Market
  - Portfolio
  - Business
  - Lending
  - Leaderboard
  - History
- **Top Bar**: Net Worth (besar + % change), Cash balance, Speed Control (1x / 4x / 24x), Notification Bell, Profile.

### Dashboard (Central Hub)
**Layout**:
- **Hero Section** (atas): 
  - Net Worth besar dengan sparkline chart 30 hari.
  - Quick Stats: Income Today, Expense Today, Best Performer.
- **Middle**:
  - Asset Allocation Pie Chart (klik untuk detail).
  - Cash Flow Bar Chart (mingguan/bulanan).
- **Right Sidebar** (atau collapsible di mobile):
  - Active Loans.
  - Upcoming Events / Random News.
  - Quick Actions (floating button +):
    - Buy/Sell
    - Start Business
    - Take Loan
    - Apply Job

**Interaktivitas**:
- Drag & drop untuk rebalance portfolio.
- Click anywhere on chart → detail view.

---

## 3. Key Screens Detail

### Market Page
- **Top**: Tabs (All / Stocks / Crypto / Bonds / Funds) + Search + Filter (Volatility, Performance).
- **List**: Card-based atau table dengan:
  - Symbol + Logo fiktif
  - Current Price + % Change (warna dinamis)
  - Volume & Trend arrow
- **Detail Modal** (klik item):
  - Large price chart (candlestick + moving average).
  - Buy/Sell panel (slider quantity + estimated total).
  - Fundamental info + Risk meter.
  - "Watch" button.

### Portfolio
- Grid cards per aset.
- Sorting: Value, Profit/Loss, Allocation %.
- Performance summary dengan breakdown.

### Business Management
- Dashboard bisnis sendiri (jika punya >1).
- Visual factory/office yang upgradeable (level 1 → 10 dengan visual change).
- Revenue/Expense waterfall chart.
- Employee management (simple list + salary).

### Lending Marketplace
- **Tab**: My Loans / Available Offers / My Debts.
- Card pinjaman: Amount, Interest, Tenor, Borrower/Lender name, Risk indicator.
- Form buat pinjaman: Slider amount, interest rate, tenor + preview cicilan.
- Real-time bidding atau accept/decline.

### Leaderboard
- Ranked list dengan avatar, username, Net Worth, Change rank.
- Filter: Global / Friends / This Week / By Risk Profile.
- Click user → lihat profil publik (portfolio summary tanpa detail sensitif).

---

## 4. Gamification & Educational Elements

- **Confetti + Sound** saat mencapai milestone (First Million, Survive Recession, dll).
- **Progress Ring** di sekitar Net Worth.
- **Contextual Tooltips**: Hover/click pertama kali pada fitur → penjelasan singkat + "Don't show again".
- **Risk Meter**: Visual gauge untuk keseluruhan portofolio (Conservative → Very Aggressive).
- **Notification Center**:
  - "Harga BTC naik 12%!"
  - "Bisnis kamu untung Rp 45jt bulan ini"
  - "Pinjaman jatuh tempo besok"

---

## 5. Interaction Patterns

- **Quick Actions**: Floating Action Button (FAB) di mobile.
- **Time Control**: Prominent di top bar dengan slider speed + pause.
- **Confirmation Modals**: Untuk transaksi besar (dengan impact preview: "Net Worth akan berubah ±X%").
- **Keyboard Shortcuts** (untuk power user):
  - M → Market
  - D → Dashboard
  - L → Leaderboard
- **Gesture**: Pull to refresh di mobile untuk force tick update.

---

## 6. Accessibility & Inclusivity
- Kontras memadai (WCAG AA) pada light theme.
- Screen reader friendly (ARIA labels).
- Font size scalable (3 level).
- Color blind friendly charts (patterns + colors).

---

## 7. Animation & Micro-interactions
- Price change: angka naik/turun dengan animasi count-up.
- Portfolio value: smooth transition.
- Loading state: skeleton + "Market updating..." dengan pulse.
- Modal masuk dengan scale + fade.

---

## 8. Component Library Recommendations
- shadcn/ui + Tailwind
- Recharts atau Chart.js untuk chart
- Framer Motion untuk animasi
- Lucide Icons atau custom finance icons

---
## 9. Game Time

Game time adalah **server-authoritative** dan SAMA untuk semua pemain (tidak ada speed control atau pause individual).

### Game Time (Real-time Clock)
- **Awal waktu**: 1 Januari 2018 00:00 UTC.
- **Skala**: 1 game menit = 10 detik real-time (tetap, tidak bisa dipercepat).
- **Format display**: `HH:MM` (hanya menit, tanpa detik).
- **1 tick** = 1 game menit (harga aset update per tick).
- **Tick interval**: 10 detik real-time (setiap tick update harga aset).
- Game time dihitung dari: `GAME_START_DATE + tickNumber × 60.000 ms`.

### Game Clock Implementation
- Server: game time = `new Date(GAME_START_DATE.getTime() + tickNumber * 60000)`.
- Tidak ada speed/pause/resume — waktu berjalan kontinu.
- Client: `GameTime` component polling `/api/simulation/speed` setiap 10 detik untuk sinkronisasi.

### Market Hours (Saham)
- Saham hanya bisa ditransaksikan jam **20:00 – 03:00** game time (8 PM – 3 AM).
- Di luar jam tersebut, order beli/jual saham ditolak.
- Aset non-STOCK (Crypto, Bond, Mutual Fund) bisa ditransaksikan kapan saja.

### Persistence
- `tickNumber` di-persist ke tabel `simulation_state` (1 baris, id=1) setiap tick.
- Saat server restart, `startTicker()` membaca `tickNumber` dari DB dan melanjutkan dari angka tersebut.
- Game time tidak restart — tetap lanjut dari waktu sebelumnya.

---
## 10. Price Engine & Trading

### Price Movement
Harga aset ditentukan oleh 3 faktor setiap tick:

1. **Random Walk** — `currentPrice × (1 + drift + shock)`
   - drift: `trendFactor` aset + dampak event global
   - shock: `volatility × volatilityMult × gaussian()`
2. **Volume Impact** — `netVolume × 0.0001` per unit.
   - Net buy (`recordTrade`) → harga naik
   - Net sell → harga turun
   - Counter di-reset tiap tick
3. **Event Impact** — event global mempengaruhi volatilitas & trend

### Trade Types
#### Market Order
- Beli/jual langsung di harga saat ini (`POST /api/trade/buy`, `POST /api/trade/sell`).
- Validasi: saldo cukup (buy) / unit cukup (sell).
- Eksekusi atomic dalam DB transaction.

#### Limit Order
- User pasang target harga (`POST /api/trade/limit`).
- Order disimpan dengan status `PENDING`.
- Tiap tick, `executeLimitOrders()` mengecek harga:
  - **BUY limit**: jika `currentPrice <= limitPrice` → eksekusi
  - **SELL limit**: jika `currentPrice >= limitPrice` → eksekusi
- Eksekusi menggunakan harga pasar saat trigger.
- Kalau saldo/unit tidak cukup, order tetap pending.
- User bisa cancel (`DELETE /api/trade/orders/[id]`).
- Notifikasi real-time via socket `notification:new`.
- Model: `LimitOrder { id, userId, symbol, type, quantity, limitPrice, status(PENDING|EXECUTED|CANCELLED) }`.

---
## 11. Business System

### Revenue Volatility
- Tiap bisnis punya `volatility` per-tick (konfigurasi di `config/businesses.ts`).
- Revenue aktual tiap tick: `baseRevenue × (1 + volatility × gaussian())`.
- Expense tetap (sewa, gaji) — tidak terpengaruh volatilitas.
- Revenue bisa di bawah expense → bisnis **rugi** di tick tersebut.

Tingkat risiko per tipe:
| Tipe | Volatilitas | Karakteristik |
|------|------------|---------------|
| Cafe | 15% | Stabil, jarang rugi |
| Retail | 15% | Stabil |
| Property | 8% | Sangat stabil (passive income) |
| Manufacturing | 20% | Medium |
| Tech Startup | 40% | Volatile — untung besar atau rugi |

### Experience (Pengalaman)
- Setiap 1 game-month bisnis berjalan, volatilitas turun **1%**.
- Maksimal penurunan **5%** (setelah 5 bulan).
- **Property dikecualikan** — passive income inherently stabil.
- Mekanisme: `volatility *= (1 - min(5%, monthsActive × 1%))`.
- Hitungan bulan: `(currentTick - createdAtTick) / TICKS_PER_GAME_MONTH`.

