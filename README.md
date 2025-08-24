# BandScape

A React + Vite app for exploring bands, members, labels, venues, and events across graph and map views.

## Features
- Graph view (Cytoscape) with selection, path finding, filtering, and timeline
- Map view (Leaflet) with coordinated highlighting and shortest path overlay
- Mobile-friendly controls drawer
- Background image theming by random/genre
- Share & save tools (snapshot, copy, saved views)

## Getting started

### Prerequisites
- Node.js (LTS recommended) and npm

### Install & run
```bash
npm install
npm run dev
```

The dev server will print a local URL. Open it in your browser.

### Build
```bash
npm run build
```

### Data
- Primary dataset is split into `public/nodesData.json` (nodes) and `public/linksData.json` (links). Legacy `public/data.js` is no longer used.

## Project structure
```
public/              # static assets (data files)
src/                 # app source code
  components/        # UI components
  store/             # Zustand state store
  views/             # Graph & Map views
  utils/             # helper utilities (e.g., backgrounds)
```

## License
Proprietary – all rights reserved by the project owner.
