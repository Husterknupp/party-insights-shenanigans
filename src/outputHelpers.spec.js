import { writeAsJson, writeAsMarkdown } from "./outputHelpers.res.mjs";
import { jest } from "@jest/globals";

describe("outputHelpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("writeAsJson", () => {
    it("writes JSON to file", () => {
      const fileName = "test.json";
      const data = [{ foo: "bar" }];
      let writeFileSync = jest.fn();

      writeAsJson(fileName, data, writeFileSync);

      expect(writeFileSync).toHaveBeenCalledWith(
        fileName,
        JSON.stringify(data, null, 2) + "\n",
        { encoding: "utf-8" }
      );
    });
  });

  describe("writeAsMarkdown", () => {
    it("writes formatted markdown to file", () => {
      const fileName = "test.md";
      const title = "Bundesregierung";
      const data = [
        {
          amt: "Bundeskanzler",
          name: "Olaf Scholz",
          party: "SPD",
          imageUrl: "https://example.com/image.jpg",
        },
        {
          amt: "Vizekanzler",
          name: "Robert Habeck",
          party: "Grüne",
          imageUrl: "",
        },
      ];
      let writeFileSync = jest.fn();

      writeAsMarkdown(fileName, title, data, writeFileSync);

      expect(writeFileSync).toHaveBeenCalledWith(fileName, expect.any(String), {
        encoding: "utf-8",
      });
      const markdown = writeFileSync.mock.calls[0][1];
      expect(markdown).toContain(`# ${title}`);
      expect(markdown).toMatch(/Bundeskanzler:\n/);
      expect(markdown).toMatch(/Profilbild: \!\[Olaf Scholz\]/);
      expect(markdown).toMatch(/Profilbild: \*Kein Bild verfügbar\*/);
    });

    it("can also handle Ministerpräsident data type", () => {
      const fileName = "test.md";
      const title = "Ministerpräsidenten";
      const data = [
        {
          state: "Bayern",
          name: "Markus Söder",
          party: "CSU",
          imageUrl: "https://example.com/image.jpg",
          urlCabinet: "https://example.com/cabinet",
        },
        {
          state: "Sachsen",
          name: "Michael Kretschmer",
          party: "CDU",
          imageUrl: "",
          urlCabinet: "https://example.com/cabinet2",
        },
      ];
      let writeFileSync = jest.fn();

      writeAsMarkdown(fileName, title, data, writeFileSync);

      expect(writeFileSync).toHaveBeenCalledWith(fileName, expect.any(String), {
        encoding: "utf-8",
      });
      const markdown = writeFileSync.mock.calls[0][1];
      expect(markdown).toContain(`# ${title}`);
      expect(markdown).toMatch(/Bayern:\n/);
      expect(markdown).toMatch(/Profilbild: \!\[Markus Söder\]/);
      expect(markdown).toMatch(/Kabinett: https:\/\/example.com\/cabinet/);
      expect(markdown).toMatch(/Profilbild: \*Kein Bild verfügbar\*/);
    });
  });
});
