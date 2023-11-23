import extractMinisterpraesidenten from "./extractors/ministerpraesidenten.js";
import extractBundesregierung from "./extractors/bundesregierung.js";
import extractLandesregierungen from "./extractors/landesregierungen.js";

async function run() {
  console.log("Start ministerpräsidenten");
  await extractMinisterpraesidenten();
  console.log("Done with ministerpräsidenten.\n");

  console.log("Start bundesregierung");
  await extractBundesregierung();
  console.log("Done with bundesregierung.\n");

  console.log("Start landesregierungen");
  await extractLandesregierungen();
  console.log("Done with landesregierungen.\n");
}

run()
  .then(() => console.log("All done. Ite domum!"))
  .catch(console.error);
