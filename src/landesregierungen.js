import { readFileSync } from "fs";

import { _extract } from "./landesregierungen.res.mjs";

export default async function extract() {
  // IntelliJ not sure what's your problem
  // noinspection JSCheckFunctionSignatures
  const bundeslaender = JSON.parse(
    readFileSync("./output/ministerpraesidenten.json", {
      encoding: "UTF-8",
    })
  );

  const notMapped = [];
  for (const bundesland of bundeslaender) {
    switch (bundesland.state) {
      case "Sachsen":
      case "Baden-Württemberg":
      case "Bayern":
      case "Thüringen":
      case "Schleswig-Holstein":
      case "Sachsen-Anhalt":
      case "Saarland":
      case "Rheinland-Pfalz":
      case "Nordrhein-Westfalen":
      case "Niedersachsen":
      case "Mecklenburg-Vorpommern":
      case "Hessen":
      case "Hamburg":
      case "Bremen":
      case "Brandenburg":
      case "Berlin": {
        await _extract(bundesland);
        break;
      }
      default: {
        notMapped.push(bundesland.state);
      }
    }
  }

  if (notMapped.length > 0) {
    console.log(`Bundeslaender ${notMapped.join(", ")} not mapped yet.`);
  }
}
