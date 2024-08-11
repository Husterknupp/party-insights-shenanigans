import { load } from "cheerio";
import htmlFromWikipedia from "../test-data/bundesregierung.js";
import { findRelevantTable } from "./bundesregierung.js";

describe("Bundesregierung extractor", () => {
  test("findRelevantTable works (and throws no exception)", () => {
    const $ = load(htmlFromWikipedia);
    findRelevantTable($);
  });
});
