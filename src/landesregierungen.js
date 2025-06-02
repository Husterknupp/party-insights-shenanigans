// $rows.find(`th:contains("${o}")`).attr IntelliJ cannot find - deactivate warning to not annoy me too much
// noinspection JSUnresolvedFunction

import { readFileSync } from "fs";
import axios from "axios";
import { writeAsJson, writeAsMarkdown } from "./output-helpers.js";

import {
  getAllCellsOfFirstColumnWithHeaderLike,
  findRelevantTable,
  findCabinetName,
  validateCells,
  extractPoliticians,
} from "./landesregierungen.res.mjs";

import { tableWalker } from "./tableWalker.res.mjs";

async function _extract(bundesland) {
  console.log(`\nextracting ${bundesland.urlCabinet} (${bundesland.state})`);

  const response = await axios.get(bundesland.urlCabinet);
  const cabinetName = findCabinetName(response.data);
  const relevantTable = findRelevantTable(response.data);
  const cells = tableWalker(relevantTable);

  if (!validateCells(cells)) return;

  const amtSearch = ["amt", "ressort"];
  const amtColumn = getAllCellsOfFirstColumnWithHeaderLike(cells, amtSearch);
  if (amtColumn.length === 0) {
    throw new Error(`Found no cells for headers ${amtSearch.toString()}`);
  }

  const result = extractPoliticians(amtColumn, cells, bundesland);

  console.log(`\nfound ${result.length} politicians\n`);
  console.log(result);

  // todo also add URL of cabinet to output files
  writeAsJson(
    `output/landesregierungen/${bundesland.state.toLocaleLowerCase()}.json`,
    result
  );
  writeAsMarkdown(
    `output/landesregierungen/${bundesland.state.toLocaleLowerCase()}.md`,
    bundesland.state + " - " + cabinetName,
    "amt",
    result
  );
}

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
