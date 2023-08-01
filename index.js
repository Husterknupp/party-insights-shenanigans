import axios from "axios";
import { load } from "cheerio";
import { writeFileSync } from "fs";

// todo
// * -> GitHub
// * GitHub CI notify on updates

// * same for Bundesregierung
// https://de.wikipedia.org/wiki/Bundesregierung_(Deutschland)#Zusammensetzung
// Header: Zusammensetzung
// Ressort/Amt 	Amtsinhaber/in (enthält Foto+Name)	Partei

// * same for Bundesländer
// Header: Kabinett/Mitglieder der Landesregierung
// Amt/Ressort 	Foto/Bild 	Name/Amtsinhaber 	Partei/Parteien

function writeAsJson(fileName, output) {
  writeFileSync(fileName, JSON.stringify(output, null, 2), {
    encoding: "utf-8",
  });
}

async function extractMinisterpraesidenten() {
  const response = await axios.get(
    "https://de.wikipedia.org/wiki/Liste_der_deutschen_Ministerpr%C3%A4sidenten",
  );
  const $ = load(response.data);

  const result = [];
  $('h2:contains("Amtierende Regierungschefs")')
    .siblings()
    .next("table:first")
    .find("tr")
    .each((i, row) => {
      const cells = $(row).find("td");
      if (cells.length === 0) return; // for table header

      const state = $(cells[0]).find('[style="display:none;"]').text().trim();
      const name = $(cells[1]).find("a").text();
      const image = $(cells[2]).find("img").attr("src");
      let imageUrl = image ? `https:${image}` : null;
      if (imageUrl) {
        // Resize image to non-thumb size
        // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
        let parts = imageUrl.split("/");
        parts = parts.filter((_, index) => index !== parts.length - 1);
        parts.push("400px-" + parts[parts.length - 1]);
        imageUrl = parts.join("/");
      }
      const party = $(cells[4]).text().trim();
      const path = $(cells[9]).find("a").attr("href");
      const urlCabinet = "https://de.wikipedia.org" + path;

      result.push({
        state,
        name,
        party,
        imageUrl,
        urlCabinet,
      });
    });

  result.sort(({ state: stateA }, { state: stateB }) =>
    stateA.localeCompare(stateB),
  );

  writeAsJson("ministerpraesidenten.json", result);
}

function run() {
  extractMinisterpraesidenten();
}

run();
