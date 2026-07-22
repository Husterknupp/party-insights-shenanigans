import { jest } from "@jest/globals";

const exportJsonFileToApkgMock = jest.fn();

jest.unstable_mockModule("./ankiDeckBuilder.res.mjs", () => ({
  exportJsonFileToApkg: exportJsonFileToApkgMock,
}));

const { deckNameFor, exportOutputFileToApkg } = await import("./apkgFileExport.js");

describe("deckNameFor", () => {
  it("capitalizes a single-word basename and nests it under Party Insights", () => {
    expect(deckNameFor("bundesregierung")).toBe("Party Insights::Bundesregierung");
  });

  it("capitalizes every hyphen-separated word", () => {
    expect(deckNameFor("sachsen-anhalt")).toBe("Party Insights::Sachsen-Anhalt");
    expect(deckNameFor("baden-württemberg")).toBe("Party Insights::Baden-Württemberg");
    expect(deckNameFor("schleswig-holstein")).toBe("Party Insights::Schleswig-Holstein");
  });

  it("preserves umlauts without any special-casing", () => {
    expect(deckNameFor("ministerpräsidenten")).toBe("Party Insights::Ministerpräsidenten");
    expect(deckNameFor("thüringen")).toBe("Party Insights::Thüringen");
  });
});

describe("exportOutputFileToApkg", () => {
  beforeEach(() => {
    exportJsonFileToApkgMock.mockReset();
  });

  it("derives the .apkg path and deck name from the input path, next to the JSON file", async () => {
    await exportOutputFileToApkg("output/landesregierungen/sachsen-anhalt.json");

    expect(exportJsonFileToApkgMock).toHaveBeenCalledWith(
      "output/landesregierungen/sachsen-anhalt.json",
      "output/landesregierungen/sachsen-anhalt.apkg",
      "Party Insights::Sachsen-Anhalt",
    );
  });

  it("returns the .apkg output path", async () => {
    const outputFilePath = await exportOutputFileToApkg("output/bundesregierung.json");
    expect(outputFilePath).toBe("output/bundesregierung.apkg");
  });
});
