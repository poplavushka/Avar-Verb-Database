# Avar Verbal Database

A static web interface for a morphologically annotated database of Avar verbs.
The site is built as a client-side React app and can be hosted on GitHub Pages
without a backend.

## Features

- Dictionary search over verb stems, infinitives, definitions, Russian glosses,
  valency frames, and examples.
- Separate Cyrillic and Latin transliteration search modes.
- Special-character keyboard for Cyrillic and Latin input.
- Filters for verb class, derivational type, transitivity, derived verbs,
  verbs with derivatives, causatives, and saved entries.
- Verb detail pages with grammatical information, derivational links,
  definitions, valency frames, and examples.
- CSV and XLSX export from the current search result.
- Shareable URLs for searches and filters.

## Tech Stack

- Vite
- React
- TypeScript
- Static JSON data generated from CSV

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The app is served locally at:

```text
http://127.0.0.1:5173/
```

## Data Files

The checked-in source data lives in:

```text
public/data/verbal_database.csv
```

The frontend loads the preprocessed static dataset from:

```text
public/data/verbal_database.json
```

Intermediate generated files are stored in:

```text
data/normalized-column-map.json
data/normalized-rows.json
data/grouped-entries.json
```

## Rebuilding the Dataset

Run the full data pipeline:

```bash
npm run data:build
```

This normalizes CSV columns and rows, groups rows into dictionary entries, and
generates the JSON dataset used by the site.

## Production Build

Build the static site:

```bash
npm run build
```

The production output is written to:

```text
dist/
```

## GitHub Pages

The project is configured for static hosting. Use GitHub Pages with GitHub
Actions and deploy the generated `dist/` directory.

Recommended workflow steps:

```bash
npm install
npm run build
```

Then upload `dist/` as the Pages artifact.

## Repository

GitHub repository:

```text
https://github.com/poplavushka/Avar-Verb-Database
```
