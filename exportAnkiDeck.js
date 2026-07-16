import path from "node:path";
import { exportJsonFileToApkg } from "./src/ankiExporter.res.mjs";

async function run() {
  const jsonFilePath = process.argv[2];
  if (!jsonFilePath) {
    throw new Error("Usage: node exportAnkiDeck.js <path-to-output-json-file>");
  }

  const deckName = path.basename(jsonFilePath, ".json");
  const outputFilePath = path.join(path.dirname(jsonFilePath), `${deckName}.apkg`);

  await exportJsonFileToApkg(jsonFilePath, outputFilePath, deckName);
}

run().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
