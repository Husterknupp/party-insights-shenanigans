# Plan: Shared ImageUrl Module (PR #46)

## Problem

Image-URL-Normalisierung ist aktuell an drei Stellen dupliziert:

| Datei | Logik |
|---|---|
| `src/tableWalker.res:225` | `"400px-" ++ ...` |
| `src/bundesregierung.js:10-14` | `"400px-" + ...` |
| `src/ministerpraesidenten.js:87-90` | `.replace(/\/\d+px-/, "/500px-")` |

Die `landesregierungen.res` verwendet den TableWalker und erbt dessen 400px-Logik.

## Plan

1. **Neues Modul** `src/ImageUrl.res` (Großbuchstabe weil ReScript) mit einer Funktion:
   ```rescript
   let normalizeWikiImageUrl: string => string
   ```
   - Protokoll-relative URLs (`//upload.wikimedia.org/...`) → `https://...`
   - Thumbnail-Größe auf 500px setzen (`/120px-` → `/500px-`)
   - Definierte MediaWiki-Größe: https://www.mediawiki.org/wiki/Common_thumbnail_sizes

2. **Aufräumen** aller drei Stellen:
   - `tableWalker.res` → `ImageUrl.normalizeWikiImageUrl` nutzen
   - `bundesregierung.js` → `ImageUrl.normalizeWikiImageUrl` importieren
   - `ministerpraesidenten.js` → `ImageUrl.normalizeWikiImageUrl` importieren (via `.res.mjs`)

3. **Tests anpassen**: Pixel-Zahl in `tableWalker.spec.js` von 400px auf 500px ändern

## Abhängigkeiten

- Wartet auf Merge von PR #45 (Bugfix: Validierung + Fehlermeldungen)
