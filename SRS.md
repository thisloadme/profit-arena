# Software Requirements Specification (SRS)
**Game: Financial Simulation Arena**

**Version**: 1.0  
**Date**: Juli 2026  
**Based on**: PRD_Financial_Simulation_Game.md

---

## 1. Introduction

### 1.1 Purpose
Dokumen ini mendefinisikan persyaratan perangkat lunak secara detail untuk game simulasi finansial multiplayer berbasis web. SRS ini menjadi acuan teknis bagi developer untuk mengimplementasikan fitur sesuai PRD.

### 1.2 Scope
Sistem mencakup:
- Simulasi ekonomi fiktif dengan randomisasi harga aset.
- Multiplayer lending antar user.
- Manajemen aset, bisnis, karir, dan utang.
- Gamifikasi (leaderboard, achievement).
- Tutorial interaktif.
- Real-time update via WebSocket.

**Out of Scope** (MVP): NFT, voice chat, advanced AI NPC, mobile native app.

### 1.3 Definitions & Abbreviations
- **Tick**: Satuan waktu simulasi (1 tick ≈ 1 hari game).
- **Net Worth**: Total aset - total utang.
- **PWA**: Progressive Web App.

---

## 2. Overall Description

### 2.1 Product Perspective
Game edukasi finansial yang menggabungkan elemen simulation, strategy, dan social competition.

### 2.2 Product Functions
- User registration & onboarding.
- Real-time market simulation.
- Portfolio & business management.
- Peer-to-peer + bank lending.
- Global leaderboard.
- Educational tooltips & reports.

### 2.3 User Classes
- **Player Baru**: Butuh tutorial intensif.
- **Player Aktif**: Fokus pada optimalisasi strategi.
- **Player Kompetitif**: Mengejar leaderboard.

### 2.4 Operating Environment
- Browser modern (Chrome, Firefox, Safari).
- Internet connection (real-time).
- Mobile & Desktop via PWA.

### 2.5 Design Constraints
- Menggunakan Next.js + TypeScript.
- Database relational (PostgreSQL).
- Real-time communication via Socket.io.

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### 3.1.1 User Management
- **FR-01**: User dapat register/login dengan email/username.
- **FR-02**: Sistem menyimpan profil, risk profile, dan histori.
- **FR-03**: Session management & auto logout.

#### 3.1.2 Onboarding Tutorial (E)
- **FR-04**: Tutorial interaktif dengan arrow pointer ke elemen UI.
- **FR-05**: Step-by-step guidance (income → invest → business → lending).
- **FR-06**: Bisa di-skip dan di-repeat.

#### 3.1.3 Simulation Engine (B)
- **FR-07**: Tick scheduler (configurable interval).
- **FR-08**: Random price generator untuk setiap aset (Random Walk + volatility + macro trend).
- **FR-09**: Generate random events secara periodik.
- **FR-10**: Update Net Worth, cash flow, loan interest tiap tick.
- **FR-11**: Real-time broadcast update harga ke semua client.

#### 3.1.4 Market & Investment (C)
- **FR-12**: Halaman Market dengan filter dan search.
- **FR-13**: Buy/Sell aset dengan validasi saldo.
- **FR-14**: Portfolio tracking dengan average price & unrealized P/L.

#### 3.1.5 Business Management
- **FR-15**: Create & upgrade bisnis.
- **FR-16**: Revenue/expense calculation tiap tick.
- **FR-17**: Hire/fire employee (NPC).

#### 3.1.6 Lending System (D)
- **FR-18**: Buat pinjaman (amount, rate, tenor).
- **FR-19**: Browse & accept pinjaman dari player lain.
- **FR-20**: Pinjaman dari Bank NPC dengan credit scoring sederhana.
- **FR-21**: Automatic repayment + late penalty.
- **FR-22**: Notifikasi real-time untuk lender & borrower.

#### 3.1.7 Gamification
- **FR-23**: Global leaderboard berdasarkan Net Worth (cached & updated periodically).
- **FR-24**: Achievement system.
- **FR-25**: Daily quests.

#### 3.1.8 Dashboard & Reporting (C)
- **FR-26**: Real-time dashboard (Net Worth, Allocation, Cash Flow).
- **FR-27**: Transaction history.
- **FR-28**: Monthly/Yearly financial report.

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance
- Tick update < 2 detik untuk < 500 concurrent users.
- Page load < 2 detik.
- Real-time update latency < 1 detik.

#### 3.2.2 Scalability
- Support minimal 1000 active users.
- Horizontal scaling untuk Socket server.

#### 3.2.3 Security
- All financial transactions menggunakan transaction DB (ACID).
- Rate limiting pada API.
- Input validation & sanitization.
- JWT authentication.

#### 3.2.4 Reliability
- Data simulation tersimpan secara konsisten.
- Recovery jika tick gagal.

#### 3.2.5 Usability
- Mobile-first responsive design.
- Intuitive UI dengan educational tooltips.
- Dark/Light mode.

#### 3.2.6 Maintainability
- Clean code + TypeScript strict.
- Modular architecture.
- Comprehensive logging.

---

## 4. Use Cases

**UC-01**: New User Onboarding  
**UC-02**: Buy/Sell Investment  
**UC-03**: Create & Manage Business  
**UC-04**: Lend/Borrow Money  
**UC-05**: Monitor Market & React to Events  
**UC-06**: Compete on Leaderboard  

(Setiap use case dapat di-detail lebih lanjut nanti).

---

## 5. Assumptions & Dependencies
- User memiliki koneksi internet stabil.
- Random number generator cukup baik (crypto-secure jika perlu).
- Tidak ada integrasi payment gateway sungguhan.
- Browser support WebSocket.

---

## 6. Appendices
- Database Schema (dari PRD).
- Wireframe/UI Mockup (akan dibuat terpisah).
- API Endpoint List (akan dibuat setelah SRS ini).
