# Lembra

A spaced-repetition flashcard app that works offline, built mobile-first as a PWA and packaged for Android and iOS with Capacitor.

**Live demo:** https://lembra-nine.vercel.app &nbsp;·&nbsp; the interface is in Brazilian Portuguese ("Lembra" means "remembers").

> Study less, remember more. Each card is scheduled to come back just before you would forget it.

## Why it exists

Anki is powerful, but people abandon it: review piles grow after a few days away, setup is confusing and creating cards is slow. Lembra tries to fix those specific problems (the research and decisions are written down in [`docs/superpowers/specs`](docs/superpowers/specs), in Portuguese):

| Problem with Anki | What Lembra does |
|---|---|
| Review backlog after days off leads to quitting | Daily limit derived from "minutes per day", cards prioritised by forgetting risk, new cards pause automatically when the backlog grows |
| Dated UI, confusing settings | One visible setting ("minutes per day"); everything else under "Advanced" |
| Creating cards is tedious | "Save and next" flow, plus JSON import so any AI tool can generate a deck |
| Punishing streaks | One automatic rest day per week |
| Paid on iPhone | Free PWA on Android and iPhone |

## Features

- Decks and cards, with a card that flips on tap and four answer grades
- Scheduling with the open-source **FSRS** algorithm ([`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs))
- Import decks by pasting JSON or opening a `.json` file, with a preview before saving; export a deck through the phone's share sheet
- Fully **offline**: data lives on the device in IndexedDB (Dexie), with automatic backup
- Light, dark and automatic theme
- Installable PWA, and an Android app built with Capacitor

## Tech stack

| Area | Choice |
|---|---|
| UI | React 19, React Router 7, TypeScript, Motion for gestures and transitions |
| Build | Vite 7, `vite-plugin-pwa` (service worker + manifest) |
| Data | Dexie 4 (IndexedDB), local-first, no backend |
| Scheduling | ts-fsrs |
| Mobile | Capacitor 8 (Android, iOS) |
| Tests | Vitest (unit, 110 tests), Playwright (end-to-end) |
| CI/CD | GitHub Actions builds and signs the APK; Vercel hosts the web app |

## Project structure

```
src/
  domain/   Pure logic: scheduler, study queue, streak, card JSON format (unit-tested)
  data/     Dexie database and data access: decks, cards, reviews, settings, import/export, backup
  ui/       Screens, components, theme tokens, platform helpers
  app/      App shell and routing
e2e/        Playwright end-to-end tests
android/    Capacitor Android project
ios/        Capacitor iOS project
assets/     Brand sources (SVG logo, icon, splash) and generated store art
docs/       Design specs and implementation plans (Portuguese)
```

The `domain` layer has no React or browser dependencies, so the scheduling and queue rules are tested in isolation.

## Run it locally

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # unit tests
npm run test:e2e     # Playwright end-to-end tests (needs `npx playwright install` once)
npm run build        # type-check + production build
```

Requires Node 24 (the version used in CI).

## Android

`.github/workflows/android.yml` builds a signed release APK on every push to `main` and publishes it to the `apk-latest` release. The signing key is stored in GitHub Secrets and is never committed.

## App stores

Pushing a `v*` tag builds a signed `.aab` for Google Play (`release-android.yml`) and an iOS build uploaded to TestFlight (`release-ios.yml`). Account setup, secrets and store listing copy are in [`docs/lojas`](docs/lojas) (Portuguese). Brand assets are regenerated with `npm run brand`.

## Roadmap

Stage 1 (this repo): the study core, offline, on the phone. Next: accounts and sync across devices, an MCP server so any AI can create cards, and a community for sharing decks. Details in [`docs/superpowers/specs`](docs/superpowers/specs).

## About the AI-assisted workflow

I built this with AI coding agents. The `docs/superpowers` folder holds the specs and step-by-step plans written before the code, and the test suites and strict type-check in the build are the gate that every change has to pass.

## Author

Lorenzo Leão Dotto, full-stack developer. [GitHub](https://github.com/DottoLeao) · [Portfolio](https://lorenzodotto.com.br)
