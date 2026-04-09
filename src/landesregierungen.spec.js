// landesregierungen.spec.js
// Unit tests for the landesregierungen module.

import { extractPoliticians } from "../src/landesregierungen.res.mjs";

describe("extractPoliticians", () => {
  const makeCell = (overrides) => ({
    colStart: 0,
    colEnd: 0,
    rowStart: 0,
    rowEnd: 0,
    imageUrl: undefined,
    header: "Amt",
    linesOfText: ["Placeholder"],
    ...overrides,
  });

  test("uses placeholder when image column is missing entirely", () => {
    // Simulates Brandenburg's Kabinett Woidke V where some rows
    // have no "Foto"/"Bild" column at all.
    const amt = makeCell({
      header: "Amt",
      linesOfText: ["Minister der Finanzen"],
      rowStart: 3,
      rowEnd: 3,
    });
    const name = makeCell({
      header: "Name",
      linesOfText: ["Daniel Keller"],
      colStart: 2,
      colEnd: 2,
      rowStart: 3,
      rowEnd: 3,
    });
    const party = makeCell({
      header: "Partei",
      linesOfText: ["SPD"],
      colStart: 4,
      colEnd: 4,
      rowStart: 3,
      rowEnd: 3,
    });

    const cells = [amt, name, party]; // no image cell

    const result = extractPoliticians(
      [amt],
      cells,
      { state: "Brandenburg", urlCabinet: "https://de.wikipedia.org/wiki/Kabinett_Woidke_V" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Daniel Keller");
    expect(result[0].party).toBe("SPD");
    expect(result[0].imageUrl).toMatch(/Portrait_placeholder/);
  });

  test("still uses real image when image column is present", () => {
    const amt = makeCell({
      header: "Amt",
      linesOfText: ["Ministerpräsident"],
      rowStart: 0,
      rowEnd: 0,
    });
    const name = makeCell({
      header: "Name",
      linesOfText: ["Dietmar Woidke"],
      colStart: 2,
      colEnd: 2,
      rowStart: 0,
      rowEnd: 0,
    });
    const party = makeCell({
      header: "Partei",
      linesOfText: ["SPD"],
      colStart: 4,
      colEnd: 4,
      rowStart: 0,
      rowEnd: 0,
    });
    const image = makeCell({
      header: "Foto",
      linesOfText: [],
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/real-image.jpg",
      colStart: 1,
      colEnd: 1,
      rowStart: 0,
      rowEnd: 0,
    });

    const cells = [amt, name, party, image];

    const result = extractPoliticians(
      [amt],
      cells,
      { state: "Brandenburg", urlCabinet: "https://de.wikipedia.org/wiki/Kabinett_Woidke_V" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toBe("https://upload.wikimedia.org/wikipedia/commons/real-image.jpg");
  });
});
