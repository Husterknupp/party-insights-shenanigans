import axios from "axios";
import { load } from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { writeAsJson, writeAsMarkdown } from "./outputHelpers.res.mjs";

function createImageFiles(ministerpraesidenten) {
  mkdirSync("output-images/ministerpraesidenten/", { recursive: true });
  ministerpraesidenten.forEach((ministerpraesident) => {
    axios
      .get(ministerpraesident.imageUrl, {
        responseType: "arraybuffer",
      })
      .then((image) => {
        console.log("Downloaded file for " + ministerpraesident.name);

        // We store images in a separate directory so that we can exclude them from version control.
        //   Initially we did that, but diffing images is hard (now, relying on the image URL as the source of truth)
        writeFileSync(
          "output-images/ministerpraesidenten/" +
            ministerpraesident.name +
            ".jpg",
          image.data,
          {
            encoding: "base64",
          }
        );
      });
  });
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

function saveToOutputfiles(ministerpraesidenten) {
  ministerpraesidenten.sort(({ state: stateA }, { state: stateB }) =>
    stateA.localeCompare(stateB)
  );

  writeAsJson("output/ministerpraesidenten.json", ministerpraesidenten);
  writeAsMarkdown(
    "output/ministerpraesidenten.md",
    "Ministerpräsidenten",
    ministerpraesidenten
  );
  createImageFiles(ministerpraesidenten);
}

export default async function extract() {
  const wikiResponse = await axios.get(
    "https://de.wikipedia.org/wiki/Liste_der_deutschen_Ministerpr%C3%A4sidenten"
  );
  const ministerpraesidenten = findPoliticians(wikiResponse.data);
  saveToOutputfiles(ministerpraesidenten);
}
