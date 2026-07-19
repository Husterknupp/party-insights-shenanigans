import axios from "axios";
import { load } from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { writeAsJson, writeAsMarkdown } from "./outputHelpers.res.mjs";
import { normalizeWikiImageUrl } from "./ImageUrl.res.mjs";

async function createImageFiles(ministerpraesidenten) {
  mkdirSync("output-images/ministerpraesidenten/", { recursive: true });

  // Download images sequentially with delay to avoid rate limiting
  async function downloadWithDelay(index) {
    if (index >= ministerpraesidenten.length) return;

    const ministerpraesident = ministerpraesidenten[index];
    if (!ministerpraesident.imageUrl) {
      console.error(
        `Skipping image download for ${ministerpraesident.name} (${ministerpraesident.state}): imageUrl is ${ministerpraesident.imageUrl}`,
      );
      await downloadWithDelay(index + 1);
      return;
    }
    try {
      const image = await axios.get(ministerpraesident.imageUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
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
        },
      );
    } catch (err) {
      console.error(
        `Failed to download image for ${ministerpraesident.name} (${ministerpraesident.state}): ${err.message}`,
      );
      console.error(`  URL: ${ministerpraesident.imageUrl}`);
    }

    // Wait 1 second before next request to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await downloadWithDelay(index + 1);
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
      const name = $(cells[1]).find("a").text().trim();
      const image = $(cells[2]).find("img").attr("src");
      const party = $(cells[4]).text().trim();
      const cabinet = $(cells[9]).find("a").attr("href");

      const context = `${state || "(unknown Bundesland)"} / ${name || "(unknown name)"}`;

      // Validate: all required fields must be present
      const missing = [];
      if (!state) missing.push("state/Bundesland");
      if (!name) missing.push("name");
      if (!party) missing.push("party/Partei");
      if (!image) missing.push("imageUrl");
      if (!cabinet) missing.push("cabinet/kabinett URL");
      if (missing.length > 0) {
        throw new Error(
          `Missing fields for ${context}: ${missing.join(", ")}` +
            `\n  state=${state}, name=${name}, party=${party}, image=${image}, cabinet=${cabinet}`,
        );
      }

      // image may be a full URL, protocol-relative (//upload.wikimedia.org/...), or a relative path
      const imageUrl = normalizeWikiImageUrl(
        image.startsWith("http") || image.startsWith("//")
          ? image
          : "https://de.wikipedia.org" + image,
      );

      // cabinet may be a full URL, protocol-relative (//de.wikipedia.org/...), or a relative path (/wiki/...)
      const urlCabinet = cabinet.startsWith("http")
        ? cabinet
        : cabinet.startsWith("//")
          ? "https:" + cabinet
          : "https://de.wikipedia.org" + cabinet;

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
      `Could not extract any Ministerpräsidenten. Searched for '${wikiHeadline}'`,
    );
  }

  return result;
}

async function saveToOutputfiles(ministerpraesidenten) {
  ministerpraesidenten.sort(({ state: stateA }, { state: stateB }) =>
    stateA.localeCompare(stateB),
  );

  writeAsJson("output/ministerpraesidenten.json", ministerpraesidenten);
  writeAsMarkdown(
    "output/ministerpraesidenten.md",
    "Ministerpräsidenten",
    ministerpraesidenten,
  );
  await createImageFiles(ministerpraesidenten);
}

export default async function extract() {
  const WIKI_URL =
    "https://de.wikipedia.org/wiki/Liste_der_deutschen_Ministerpr%C3%A4sidenten";
  console.log(`Fetching ${WIKI_URL}`);
  const wikiResponse = await axios.get(WIKI_URL, {
    headers: {
      "User-Agent":
        "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
    },
  });
  const ministerpraesidenten = findPoliticians(wikiResponse.data);
  await saveToOutputfiles(ministerpraesidenten);
}
