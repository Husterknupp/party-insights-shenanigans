import fs from "node:fs";
import { exportOutputFileToApkg } from "./src/apkgFileExport.js";

// distinguishes an expected, clean-message validation failure (printed as just its
// message) from an unexpected error (printed with its full stack, so CI/a user can
// still diagnose it) — see the guarded catch block below
export class UsageError extends Error {}

export async function run() {
  const jsonFilePath = process.argv[2];
  if (!jsonFilePath) {
    throw new UsageError("Usage: node ankiExportCli.js <path-to-output-json-file>");
  }
  if (!fs.existsSync(jsonFilePath)) {
    throw new UsageError(`File not found: ${jsonFilePath}`);
  }

  await exportOutputFileToApkg(jsonFilePath);
}

// guarded so importing from this file in a test doesn't also trigger the CLI run,
// which would exit the test process
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err instanceof UsageError ? err.message : err.stack || err);
    process.exit(1);
  });
}
