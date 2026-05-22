# Bayar — Split Bill MVP

Bayar is a React/Vite split-bill MVP for organizers to create shared bills, track payment progress, nudge pending members, and let participants confirm payments through shareable public links.

## Features

- Simulated auth flow: signup, login, logout
- Organizer dashboard with animated collection progress
- Create shared bills with equal or custom split methods
- Organizer automatically added as a paid participant
- Live organizer remainder preview for custom splits
- Participant-specific payment links
- Bill-level fallback share link for self-identification
- Public member payment page
- Payment methods: FPX, Online Banking, Manual Transfer
- Receipt upload UI that stores the filename only
- Payment success and already-paid states
- Personalized WhatsApp nudge messages
- Empty dashboard state with demo data toggle
- Date formatting like `21 May 2026`
- Responsive mobile-friendly layout

## Tech Stack

- React 19
- Vite 8
- lucide-react
- Browser persistence via `localStorage` with `window.storage` fallback support

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Open the app:

```txt
http://localhost:5173
```

## Available Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # Build production assets
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## QA Status

Automated Playwright smoke QA passed for 12/12 flows:

- Landing page load
- Signup and dashboard routing
- Logout and login session restore
- Demo data add/remove and empty state
- Equal split organizer participant logic
- Participant-specific copy link and fallback share link
- Personalized WhatsApp nudge message
- Member payment methods, receipt filename, and success screen
- Already-paid payment state
- Custom split organizer remainder logic
- Invalid payment link state
- Mobile viewport usability

Known lint caveat:

- `npm run lint` currently reports 2 issues:
  - `Bayar.jsx`: `react-hooks/set-state-in-effect`
  - `src/main.jsx`: unused `React` import

## Limitations

- No backend service yet
- Auth is simulated locally, not production authentication
- Payment confirmation is demo/local only
- Receipt upload stores the selected filename only, not the file content
- Data persists in browser storage only

## Project Structure

```txt
Bayar.jsx       # Main single-file app implementation
src/App.jsx     # Re-exports Bayar app
src/main.jsx    # React entrypoint
public/         # Static assets, including Bayar logo
```

## Delivery Notes

This MVP is suitable for local demo, product validation, and static deployment review. For production use, add real authentication, backend persistence, payment provider integration, receipt file storage, and organizer notification delivery.
