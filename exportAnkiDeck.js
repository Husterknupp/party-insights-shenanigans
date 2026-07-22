import { exportOutputFileToApkg } from "./src/apkgExport.js";

async function run() {
  const jsonFilePath = process.argv[2];
  if (!jsonFilePath) {
    console.error("Usage: node exportAnkiDeck.js <path-to-output-json-file>");
    process.exit(1);
  }

  await exportOutputFileToApkg(jsonFilePath);
}

// guarded so importing from this file in a test doesn't also trigger the CLI run,
// which would exit the test process
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
