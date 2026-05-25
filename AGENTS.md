# AGENTS.md

## ReScript Workflow
- Edit `.res` files, NEVER `.res.mjs` (those are compiled output)
- Always run `npm run res:build` after editing `.res` files
- ReScript module names must start with uppercase

## Build & Test
- Full pipeline: `npm ci && npm run res:build && npm start`
- Tests: `npm run res:build && npm test`
- NEVER commit output files with code changes — reset with `git checkout main -- output/`

## Error Handling
- Use `throw new Error(...)` or `Error.panic(...)` inside functions and helpers
- `process.exit(...)` is allowed only at the top-level entry point (e.g. `index.js` or `extract()`), not in helper functions
- Match the existing error handling pattern in the codebase

## Image URLs
- Use 500px (defined MediaWiki size), NOT 400px
- See: https://www.mediawiki.org/wiki/Common_thumbnail_sizes
