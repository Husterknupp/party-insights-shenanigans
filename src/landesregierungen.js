// $rows.find(`th:contains("${o}")`).attr IntelliJ cannot find - deactivate warning to not annoy me too much
// noinspection JSUnresolvedFunction

import { readFileSync } from "fs";
import axios from "axios";
import { load } from "cheerio";
import { writeAsJson, writeAsMarkdown } from "./output-helpers.js";

import tableWalker from "./tableWalker.js";

function sameRow(cellA, cellB) {
  return (
    (cellB.rowStart <= cellA.rowStart && cellA.rowStart <= cellB.rowEnd) ||
    (cellB.rowStart <= cellA.rowEnd && cellA.rowEnd <= cellB.rowEnd)
  );
}

export function createMinister(amt, ministerName, party, imageUrl) {
  try {
    return {
      amt: amt.linesOfText.join(", "),
      name: ministerName.linesOfText[ministerName.linesOfText.length - 1],
      imageUrl: imageUrl.imageUrl,
      party: party.linesOfText[0],
    };
  } catch (e) {
    console.error(
      `Cannot create minister object for name ${JSON.stringify(ministerName)}. Message:`,
      e.message
    );
    throw e;
  }
}

export function getLastCellOfFirstColumnWithHeaderLike(cells, searchStrings) {
  const result = getAllCellsOfFirstColumnWithHeaderLike(cells, searchStrings);

  // Using findLast here because during one term of office more than one person can have the Ministerial position.
  // Wikipedia puts all those persons in one row, the latest person at the bottom of a row.
  return result.pop();
}

export function getAllCellsOfFirstColumnWithHeaderLike(cells, searchStrings) {
  // There might be two columns of the same header.
  // Eg, tables often have more than one "name" column.
  const relevantCells = cells.filter((cell) =>
    isColumnHeaderLike(cell, searchStrings)
  );
  if (relevantCells.length === 0) {
    return [];
  }

  const firstColumnWithThatName = relevantCells.sort(
    (cellA, cellB) => 0 - (cellB.colStart - cellA.colStart)
  )[0].colStart;

  return relevantCells.filter(
    (cell) => cell.colStart === firstColumnWithThatName
  );
}

export function isColumnHeaderLike(cell, searchStrings) {
  for (const searchString of searchStrings) {
    if (
      cell.header.toLocaleLowerCase().includes(searchString.toLocaleLowerCase())
    ) {
      return true;
    }
  }
  return false;
}

function findRelevantTable(html) {
  // todo combine cheerio dependencies to single file (findRelevantTable, tableWalker)
  const $ = load(html);

  const options = [
    "Kabinett",
    "Landesregierung",
    "Mitglieder der Staatsregierung",
    "Amtierende Regierungschefs",
    "Zusammensetzung",
    "Senat",
  ];
  for (const o of options) {
    // language=JQuery-CSS
    const found = $(`h2:contains("${o}")`);
    if (found.length !== 0) {
      console.log(`found table '${o}'`);
      const result = found.parent().nextAll("table").first();
      return result.html();
    }
  }
  throw Error(
    "Couldn't find relevant table with any of the names " + options.toString()
  );
}

function findCabinetName(html) {
  const $ = load(html);
  return $("h1").text();
}

async function _extract(bundesland) {
  console.log(`\nextracting ${bundesland.urlCabinet} (${bundesland.state})`);

  const response = await axios.get(bundesland.urlCabinet);
  const cabinetName = findCabinetName(response.data);
  const relevantTable = findRelevantTable(response.data);
  const cells = tableWalker(relevantTable);
  if (cells.length !== 0) {
    console.log(`TableWalker worked successfully\n`);
  } else {
    console.error("found 0 tableWalker cells - aborting");
    return;
  }

  // Assumption is that the "Amt" column defines the rows.
  // Ie, all cells between rowStart and rowEnd correspond to one Amt-row.
  const amtSearch = ["amt", "ressort"];
  const amtColumn = getAllCellsOfFirstColumnWithHeaderLike(cells, amtSearch);
  if (amtColumn.length === 0) {
    throw new Error(`Found no cells for headers ${amtSearch.toString()}`);
  }

  const result = [];
  for (const amt of amtColumn) {
    const row = cells.filter((cell) => sameRow(cell, amt));
    const ministerName = getLastCellOfFirstColumnWithHeaderLike(row, [
      "amtsinhaber",
      "name",
    ]);
    const party = getLastCellOfFirstColumnWithHeaderLike(row, [
      "partei",
      "parteien",
    ]);
    const imageUrl = getLastCellOfFirstColumnWithHeaderLike(row, [
      "foto",
      "bild",
    ]);

    if (
      ministerName.linesOfText[0] === "Herbert Mertin" &&
      imageUrl.linesOfText[0] === "derzeit vakant" &&
      bundesland.urlCabinet ===
        "https://de.wikipedia.org/wiki/Kabinett_Schweitzer"
    ) {
      // For Rheinland-Pfalz, there is an imageUrl undefined.
      // We expect this case and need to treat it specially. The former minister ceased and there is no replacement yet
      const ministerName = { linesOfText: ["derzeit vakant"] };
      const party = { linesOfText: ["derzeit vakant"] };
      const imageUrl = { imageUrl: ["Placeholder"] };
      result.push(createMinister(amt, ministerName, party, imageUrl));
    } else if (
      amt === undefined ||
      ministerName === undefined ||
      party === undefined ||
      imageUrl?.imageUrl === undefined
    ) {
      console.error("This politician misses some detail: ", {
        amt,
        ministerName,
        party,
        imageUrl,
      });
      console.log(`\nError with cabinet ${bundesland.urlCabinet}`);
      throw new Error("Could not extract table info");
    } else {
      const sameName = result.find((minister) =>
        ministerName.linesOfText.includes(minister.name)
      );
      if (sameName !== undefined) {
        const subTitle = sameName.amt;
        sameName.amt = `${amt.linesOfText.join(", ")} (gleichzeitig: ${subTitle})`;
        continue;
      }

      result.push(createMinister(amt, ministerName, party, imageUrl));
    }
  }

  console.log(`\nfound ${result.length} minister\n`);
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
