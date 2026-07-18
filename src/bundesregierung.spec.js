import { load } from "cheerio";
import htmlFromWikipedia from "../test-data/bundesregierung.js";
import { findRelevantTable, urlForResizedImage } from "./bundesregierung.js";

describe("Bundesregierung extractor", () => {
  test("findRelevantTable works (and throws no exception)", () => {
    const $ = load(htmlFromWikipedia);
    findRelevantTable($);
  });

  test("urlForResizedImage requests a 500px thumbnail (400px is rejected by Wikimedia with a 400)", () => {
    const thumbUrl =
      "//upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Wadephul%2C_Johann-1249.jpg/74px-Wadephul%2C_Johann-1249.jpg";

    expect(urlForResizedImage(thumbUrl)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Wadephul%2C_Johann-1249.jpg/500px-Wadephul%2C_Johann-1249.jpg",
    );
  });
});
