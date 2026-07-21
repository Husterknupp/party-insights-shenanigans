import path from "node:path";
import { exportJsonFileToApkg } from "./src/ankiExporter.res.mjs";

// Mechanical: capitalizes each hyphen-separated word of the input JSON's basename and
// prefixes it under one shared "Party Insights" parent deck (Anki nests on "::" at
// import time). Works uniformly across all 18 basenames without a special case, now that
// every output file on disk uses proper German spelling (incl. umlauts) rather than an
// ASCII transliteration.
export function deckNameFor(basename) {
  const capitalized = basename
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
  return `Party Insights::${capitalized}`;
}

async function run() {
  const jsonFilePath = process.argv[2];
  if (!jsonFilePath) {
    throw new Error("Usage: node exportAnkiDeck.js <path-to-output-json-file>");
  }

  const basename = path.basename(jsonFilePath, ".json");
  const deckName = deckNameFor(basename);
  const outputFilePath = path.join(path.dirname(jsonFilePath), `${basename}.apkg`);

  await exportJsonFileToApkg(jsonFilePath, outputFilePath, deckName);
}

// guarded so importing deckNameFor (e.g. from exportAnkiDeck.spec.js) doesn't also
// trigger the CLI run, which would exit the test process
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
