import path from "node:path";
import { exportJsonFileToApkg } from "./ankiDeckBuilder.res.mjs";

// Mechanical: capitalizes each hyphen-separated word of the input JSON's basename and
// prefixes it under one shared "Party Insights" parent deck (Anki nests on "::" at
// import time). Works uniformly across all basenames without a special case, now that
// every output file on disk uses proper German spelling (incl. umlauts) rather than an
// ASCII transliteration.
export function deckNameFor(basename) {
  const capitalized = basename
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
  return `Party Insights::${capitalized}`;
}

// Shared by ankiExportCli.js (manual, single-file CLI) and index.js (automatic, one
// call per output file the scrape pipeline produces) so both go through the exact same
// deck-naming and output-path logic instead of two copies drifting apart.
export async function exportOutputFileToApkg(jsonFilePath) {
  if (path.extname(jsonFilePath) !== ".json") {
    throw new Error(`Expected a JSON output file, received: ${jsonFilePath}`);
  }

  const basename = path.basename(jsonFilePath, ".json");
  const deckName = deckNameFor(basename);
  const outputFilePath = path.join(path.dirname(jsonFilePath), `${basename}.apkg`);

  await exportJsonFileToApkg(jsonFilePath, outputFilePath, deckName);
  return outputFilePath;
}
