# Avar Verbal Database

Static client-side dictionary for the Avar verbal database. The app is built with Vite, React, and TypeScript and is ready for GitHub Pages deployment.

## Local development

```bash
npm install
npm run dev
```

The app reads:

- `public/data/verbal_database.csv` as the checked-in source CSV
- `public/data/verbal_database.json` as the preprocessed dataset loaded by the frontend

## Data pipeline

Rebuild all derived JSON artifacts from the checked-in CSV:

```bash
npm run data:build
```

This regenerates:

- `data/normalized-column-map.json`
- `data/normalized-rows.json`
- `data/grouped-entries.json`
- `public/data/verbal_database.json`

## Production build

```bash
npm run build
```
