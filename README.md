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

## GitHub Pages

The repository includes `.github/workflows/deploy.yml`.

After pushing to GitHub:

1. Open repository settings.
2. Go to `Pages`.
3. Set source to `GitHub Actions` if it is not already selected.
4. Push to `main` or `master`, or run the workflow manually.

The workflow injects:

- `VITE_REPO_URL`
- `VITE_REPO_BRANCH`

so the homepage can link back to the raw CSV file in the repository.
