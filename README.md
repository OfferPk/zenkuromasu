# ZenKuromasu (黒どこ)

> **Calm, meditative Japanese Kuromasu (Kurodoko / Where is Black?) sumi ink stone logic puzzle with procedural acoustics.**

[![CI](https://github.com/OfferPk/zenkuromasu/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenkuromasu/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zenkuromasu/actions/workflows/pages.yml/badge.svg)](https://github.com/OfferPk/zenkuromasu/actions/workflows/pages.yml)
[![Android](https://github.com/OfferPk/zenkuromasu/actions/workflows/android.yml/badge.svg)](https://github.com/OfferPk/zenkuromasu/actions/workflows/android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎮 Play Live
- **Web App / PWA**: [https://offerpk.github.io/zenkuromasu/](https://offerpk.github.io/zenkuromasu/)
- **Android APK**: Download `zenkuromasu-apk` from [GitHub Actions Artifacts](https://github.com/OfferPk/zenkuromasu/actions/workflows/android.yml) or latest [Releases](https://github.com/OfferPk/zenkuromasu/releases).

---

## 📸 Screenshots

| Sumi Ink Stones & Rays | Sightline Deduction | Grand Palace Layouts |
|:---:|:---:|:---:|
| *(Tactile stone & dot placement)* | *(Interactive live line-of-sight rays)* | *(50 levels across 5 difficulty packs)* |

---

## 🌸 About the Game

ZenKuromasu is inspired by the classic Japanese pencil-and-paper puzzle **Kuromasu** (黒どこ / *Kurodoko*, meaning "Where are the black cells?"), created and popularized by Nikoli.

You discover the hidden positions of dark sumi ink stones on peaceful Japanese grids:
1. **Line of Sight Clues**: Each circled number indicates how many white (unshaded) cells can be seen horizontally and vertically from that cell, including itself.
2. **Blocked Vision**: Black stones block lines of sight. Clue cells can never be black stones.
3. **No Adjacent Stones**: Two black stones can never touch orthogonally (they cannot share an edge; diagonal contact is permitted).
4. **Connected White Paths**: All white cells must form a single, continuous orthogonal path across the entire board.

---

## ✨ Features

- **50 Handcrafted Levels**: 5 difficulty tiers (Morning Mist 5×5, Sumi Garden 6×6, Stone Pavilion 7×7, Bamboo Sanctuary 8×8, Imperial Palace 9×9).
- **100% Unique Solutions**: All 50 levels verified by an exhaustive constraint backtracking solver.
- **Procedural Japanese Web Audio**:
  - Deep tactile stone placement thuds with soft sumi ink brush whispers.
  - Gentle river pebble clinks when placing confirmed white dots.
  - Soft sliding paper rustle when clearing cells.
  - Bamboo water spout (*shishi-odoshi*) chimes when a clue is satisfied.
  - Wooden block warning chime on conflicting adjacent stones.
  - Majestic Japanese Buddhist temple bell (*Bonshō* 梵鐘) with authentic 108 Hz harmonic partials upon level completion.
- **Fluid Controls**:
  - Tap to cycle through: Empty → Black Stone → White Dot → Empty.
  - Dedicated tool mode buttons (Stone / Dot) for fast mobile placement.
  - Tap any clue to illuminate its horizontal and vertical line of sight rays.
- **Deductive Hint Engine**: Step-by-step logic guidance explaining adjacent-to-stone deductions, sightline boundary requirements, and white path connectivity bottlenecks.
- **Unlimited Undo & Reset**: Experiment freely with full state history.
- **Offline & Private**: Built as a zero-dependency Progressive Web App (PWA) with Service Worker and Capacitor Android packaging. Zero ads, zero trackers, no permissions needed.

---

## 🛠️ Development & Build

### Prerequisites
- Node.js (v20+ recommended)
- npm

### Run Locally
```bash
# Clone the repository
git clone https://github.com/OfferPk/zenkuromasu.git
cd zenkuromasu

# Run unit tests
npm test

# Build static assets to www/
npm run build
```

To run a local web server:
```bash
npx serve www
```

### Android APK Build
The project uses Capacitor to package the web assets into a native Android application:
```bash
# Add or sync Android platform
npx cap add android
npx cap sync android

# Build debug APK via Gradle
cd android
./gradlew assembleDebug
```
The resulting debug APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
