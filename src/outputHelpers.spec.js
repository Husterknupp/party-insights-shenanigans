import { writeAsJson, writeAsMarkdown, hasValidImageUrl } from "./outputHelpers.res.mjs";
import { jest } from "@jest/globals";

describe("outputHelpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hasValidImageUrl", () => {
    it("accepts a real, non-svg photo URL", () => {
      expect(
        hasValidImageUrl({
          name: "Jane Doe",
          party: "N/A",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Jane.jpg/500px-Jane.jpg",
        }),
      ).toBe(true);
    });

    it("rejects an empty imageUrl", () => {
      expect(hasValidImageUrl({ name: "Jane Doe", party: "N/A", imageUrl: "" })).toBe(false);
    });

    // Regression test: Rheinland-Pfalz's "no photo" icon (Keinfoto.svg) used to slip
    // through undetected because the old check only matched the two other known
    // placeholder filenames ("replace_this_image", "Placeholder") by name, not by
    // file type. Once #60's .svg thumbnail fix made this URL downloadable, this
    // Wikipedia icon would have been silently embedded as a real profile photo.
    it.each([
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Keinfoto.svg/500px-Keinfoto.svg.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Silver_-_replace_this_image_male.svg/500px-Silver_-_replace_this_image_male.svg.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Silver_-_replace_this_image_female.svg/500px-Silver_-_replace_this_image_female.svg.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Placeholder_staff_photo.svg/500px-Placeholder_staff_photo.svg.png",
    ])("rejects the Wikipedia placeholder icon at %s", (imageUrl) => {
      expect(hasValidImageUrl({ name: "Jane Doe", party: "N/A", imageUrl })).toBe(false);
    });
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
