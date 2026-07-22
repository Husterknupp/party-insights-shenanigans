import { readdirSync } from "node:fs";
import path from "node:path";
import extractMinisterpraesidenten from "./src/ministerpraesidenten.js";
import extractBundesregierung from "./src/bundesregierung.js";
import { extract as extractLandesregierungen } from "./src/landesregierungen.res.mjs";
import { exportOutputFileToApkg } from "./src/apkgFileExport.js";

async function exportApkg(jsonFilePath) {
  const outputFilePath = await exportOutputFileToApkg(jsonFilePath);
  console.log(`Exported Anki deck to ${outputFilePath}`);
}

async function run() {
  console.log("Start ministerpräsidenten");
  await extractMinisterpraesidenten();
  await exportApkg("output/ministerpräsidenten.json");
  console.log("Done with ministerpräsidenten.\n");

  console.log("Start bundesregierung");
  await extractBundesregierung();
  await exportApkg("output/bundesregierung.json");
  console.log("Done with bundesregierung.\n");

  console.log("Start landesregierungen");
  await extractLandesregierungen();
  const landesregierungenDir = "output/landesregierungen";
  const landesregierungenFiles = readdirSync(landesregierungenDir).filter((file) =>
    file.endsWith(".json"),
  );
  for (const file of landesregierungenFiles) {
    await exportApkg(path.join(landesregierungenDir, file));
  }
  console.log("Done with landesregierungen.\n");
}

// Explicit .catch() rather than relying on Node's default unhandled-rejection crash:
// importing the Anki export chain above pulls in sql.js (an Emscripten build used by
// anki-apkg-export), which registers its own global `process.on("unhandledRejection")`
// that calls `process.exit(1)` with no output. That handler runs instead of Node's
// default "print the stack trace" behavior for ANY unhandled rejection in this process
// once it's registered — including one from the scraping step, unrelated to sql.js —
// silently losing the error CI needs to diagnose a failure (see #39, test/integration.spec.js).
run()
  .then(() => console.log("All done! Ite domum."))
  .catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
