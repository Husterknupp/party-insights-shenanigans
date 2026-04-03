import axios from "axios";
import { load } from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { writeAsJson, writeAsMarkdown } from "./outputHelpers.res.mjs";

async function createImageFiles(ministerpraesidenten) {
  mkdirSync("output-images/ministerpraesidenten/", { recursive: true });

  // Download images sequentially with delay to avoid rate limiting
  async function downloadWithDelay(index) {
    if (index >= ministerpraesidenten.length) return;

    const ministerpraesident = ministerpraesidenten[index];
    try {
      const image = await axios.get(ministerpraesident.imageUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
        },
      });
      console.log("Downloaded file for " + ministerpraesident.name);

      writeFileSync(
        "output-images/ministerpraesidenten/" +
          ministerpraesident.name +
          ".jpg",
        image.data,
        {
          encoding: "base64",
        }
      );
    } catch (err) {
      console.error("Failed to download image for " + ministerpraesident.name + ": " + err.message);
    }

    // Wait 1 second before next request to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    return downloadWithDelay(index + 1);
  }

  return await downloadWithDelay(0);
}

function findPoliticians(html) {
  const $ = load(html);
  const wikiHeadline = "Amtierende Regierungschefs";

  const result = [];
  $(`h2:contains(${wikiHeadline})`)
    .parent()
    .siblings()
    .next("table:first")
    .find("tr")
    .each((i, row) => {
      const cells = $(row).find("td");
      if (cells.length === 0) return; // for table header

      const state = $(cells[0]).find('[style="display:none;"]').text().trim();
      const name = $(cells[1]).find("a").text();
      const image = $(cells[2]).find("img").attr("src");
      // Resize image to non-thumb size
      // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
      let parts = image.split("/");
      parts = parts.filter((_, index) => index !== parts.length - 1);
      parts.push("400px-" + parts[parts.length - 1]);
      const imageUrl = "https:" + parts.join("/");
      const party = $(cells[4]).text().trim();
      const cabinet = $(cells[9]).find("a").attr("href");
      const urlCabinet = "https://de.wikipedia.org" + cabinet;

      result.push({
        state,
        name,
        party,
        imageUrl,
        urlCabinet,
      });
    });

  if (result.length === 0) {
    throw new Error(
      `Could not extract any Ministerpräsidenten. Searched for '${wikiHeadline}'`
    );
  }

  return result;
}

async function saveToOutputfiles(ministerpraesidenten) {
  ministerpraesidenten.sort(({ state: stateA }, { state: stateB }) =>
    stateA.localeCompare(stateB)
  );

  writeAsJson("output/ministerpraesidenten.json", ministerpraesidenten);
  writeAsMarkdown(
    "output/ministerpraesidenten.md",
    "Ministerpräsidenten",
    ministerpraesidenten
  );
  await createImageFiles(ministerpraesidenten);
}

export default async function extract() {
  const wikiResponse = await axios.get(
    "https://de.wikipedia.org/wiki/Liste_der_deutschen_Ministerpr%C3%A4sidenten",
    {
      headers: {
        "User-Agent": "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
      },
    }
  );
  const ministerpraesidenten = findPoliticians(wikiResponse.data);
  await saveToOutputfiles(ministerpraesidenten);
}
