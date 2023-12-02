// $rows.find(`th:contains("${o}")`).attr IntelliJ cannot find - deactivate warning to not annoy me too much
// noinspection JSUnresolvedFunction

import { readFileSync } from "fs";
import axios from "axios";
import { load } from "cheerio";
import { writeAsJson, writeAsMarkdown } from "./output-helpers.js";

function urlForResizedImage(image) {
  // Resize image to non-thumb size
  // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
  let parts = image.split("/");
  parts = parts.filter((_, index) => index !== parts.length - 1);
  parts.push("400px-" + parts[parts.length - 1]);
  return "https:" + parts.join("/");
}

function indexOfColumnParty($rows) {
  const options = ["Partei", "Parteien"];

  for (const o of options) {
    // language=JQuery-CSS
    const found = $rows.find(`th:contains("${o}")`);
    if (found.length !== 0) {
      if (found.attr("colspan") > 1) {
        console.warn(
          `[WARN] colspan ${found.attr("colspan")} for 'party' column`,
        );
      }

      console.log(
        `found 'party' column with name '${found
          .text()
          .trim()}' at index ${found.index()}`,
      );
      return found.index();
    }
  }

  throw Error("Couldn't find 'party' column");
}

function indexOfColumnName($rows) {
  const options = ["Amtsinhaber", "Name"];

  for (const o of options) {
    // language=JQuery-CSS
    const found = $rows.find(`th:contains("${o}")`);
    if (found.length !== 0) {
      if (found.attr("colspan") > 1) {
        console.warn(
          `[WARN] colspan ${found.attr("colspan")} for 'name' column`,
        );
      }

      console.log(
        `found 'name' column with name '${found
          .text()
          .trim()}' at index ${found.index()}`,
      );
      return found.index();
    }
  }

  throw Error("Couldn't find 'name' column");
}

function indexOfColumnAmt($rows) {
  const options = ["Ressort", "Amt"];

  for (const o of options) {
    // language=JQuery-CSS
    const found = $rows.find(`th:contains("${o}")`);
    if (found.length !== 0) {
      console.log(
        `found 'amt' column with name '${found
          .text()
          .trim()}' at index ${found.index()}`,
      );
      return found.index();
    }
  }
  throw Error("Couldn't find 'amt' column");
}

function findRelevantTable($cheerio) {
  const options = [
    "Kabinett",
    "Mitglieder der Landesregierung",
    "Mitglieder der Staatsregierung",
    "Amtierende Regierungschefs",
    "Zusammensetzung",
  ];
  for (const o of options) {
    // language=JQuery-CSS
    const found = $cheerio(`h2:contains("${o}")`);
    if (found.length !== 0) {
      console.log(`found table '${o}'`);
      return found.next("table").find("tr");
    }
  }
  throw Error(
    "Couldn't find relevant table with any of the names " + options.toString(),
  );
}

async function _extract(bundesland) {
  console.log(
    "\nextracting " + bundesland.urlCabinet + ` (${bundesland.state})`,
  );

  const response = await axios.get(bundesland.urlCabinet);
  const $ = load(response.data);

  const result = [];
  const rows = findRelevantTable($);

  // Column indices
  const amtIdx = indexOfColumnAmt(rows);
  const nameIdx = indexOfColumnName(rows);
  const imageIdx = nameIdx - 1;
  console.log(`assuming 'image' column at index ${imageIdx}`);
  const partyIdx = indexOfColumnParty(rows);

  const cabinetName = $("h1").text();

  console.log(`found all indexes - cabinet name: '${cabinetName}'\n`);

  rows.each((i, row) => {
    const cells = $(row).find("td");
    if (cells.length === 0) return; // for table header

    // Assuming this is a scenario where the minister changed during the same election period (Wiki lists old ones too).
    // Only the first row has the Amt, the succeeding rows are missing first column.
    // Relevant for the name is the last row (the person that is currently actually the minister).
    const override = $(cells[imageIdx - 1])
      .find("img")
      .attr("src");
    if (override) {
      console.log(`${override}: override`);
    }

    let amt;
    if (override) {
      amt = result[result.length - 1].amt;
    } else {
      amt = $(cells[amtIdx]).find("br").replaceWith(" • ").end().text().trim();
      if (amt.endsWith(" •")) {
        // Does it make sense to end content with a <br> ? Idk
        amt = amt.slice(0, amt.length - 2);
      }
      if (amt.search(/\[\d]/) !== -1) {
        console.log("Replacing footnote in text");
        amt = amt.replace(/\[\d]/, "");
      }
    }

    // todo Looking for <a /> elements here - but there are 2x ministers with plain text
    let name;
    if (override) {
      name = $(cells[nameIdx - 1])
        .find("a:first")
        .text()
        .trim();
    } else {
      name = $(cells[nameIdx]).find("a:first").text().trim();
      if (!name) {
        // This branch never happened in the override scenario
        console.info(
          `I have no name. Column ${nameIdx}. Maybe it's some sort of 'amt'?`,
        );

        if (
          amt.toLocaleLowerCase().indexOf("inneres") !== -1 ||
          amt.toLocaleLowerCase().indexOf("minister") !== -1 ||
          amt.toLocaleLowerCase().indexOf("wirtschaft") !== -1 ||
          amt.toLocaleLowerCase().indexOf("familie") !== -1
        ) {
          console.info(
            `'amt'='${amt}' looks useful. Will add it to predecessor's amt`,
          );
          const predecessor = result[result.length - 1];
          predecessor.amt = amt + ` (${predecessor.amt})`;
        } else {
          console.info(`Skipping. 'amt'=${amt}`);
        }
        return;
      }
    }

    let imageSmall;
    if (override) {
      imageSmall = $(cells[imageIdx - 1])
        .find("img")
        .attr("src");
    } else {
      imageSmall = $(cells[imageIdx]).find("img").attr("src");
    }
    if (!imageSmall) {
      throw new Error(`${name}: Missing img URL. Column ${imageIdx}`);
    }

    const imageUrl = urlForResizedImage(imageSmall);

    let party;
    if (override) {
      party = result[result.length - 1].party;
    } else {
      party = $(cells[partyIdx]).text().trim();
    }
    if (!party) {
      party = $(cells[partyIdx + 1])
        .text()
        .trim();
      // Party column often has a party-color tile in front of the text
      console.log(
        `${name}: What about a paartey? Column ${partyIdx} has no text. Reading column right of it ... '${party}'`,
      );
    }

    if (override) {
      result.pop();
    }

    result.push({
      amt,
      name,
      imageUrl,
      party,
    });
  });

  console.log(`found ${result.length} minister\n`);
  console.log(result);

  writeAsJson(
    `output/landesregierungen/${bundesland.state.toLocaleLowerCase()}.json`,
    result,
  );
  writeAsMarkdown(
    `output/landesregierungen/${bundesland.state.toLocaleLowerCase()}.md`,
    bundesland.state + " - " + cabinetName,
    "amt",
    result,
  );
}

export default async function extract() {
  // IntelliJ not sure what's your problem
  // noinspection JSCheckFunctionSignatures
  const bundeslaender = JSON.parse(
    readFileSync("./output/ministerpraesidenten/ministerpraesidenten.json", {
      encoding: "UTF-8",
    }),
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
      // case "Saarland":
      // case "Rheinland-Pfalz":
      // case "Nordrhein-Westfalen":
      // case "Niedersachsen":
      // case "Mecklenburg-Vorpommern":
      // case "Hessen":
      // case "Hamburg":
      // case "Bremen":
      // case "Brandenburg":
      // case "Berlin":
      case "NEVER": {
        await _extract(bundesland);
        break;
      }
      default: {
        notMapped.push(bundesland.state);
      }
    }
  }

  console.log(`Bundeslaender ${notMapped.join(", ")} not mapped yet.`);
}
