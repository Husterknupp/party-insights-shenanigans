// landesregierungen.spec.js
// Unit tests for the landesregierungen module, focusing on edge cases.

import { extractPoliticians } from "../src/landesregierungen.res.mjs";

describe("extractPoliticians", () => {
  // Mock tableCell
  const createCell = (overrides) => ({
    colStart: 0,
    colEnd: 0,
    rowStart: 0,
    rowEnd: 0,
    imageUrl: "https://example.com/image.jpg",
    header: "Amt",
    linesOfText: ["Ministerpräsident"],
    ...overrides,
  });

  test("handles missing imageUrl gracefully with placeholder", () => {
    const amtCell = createCell({
      header: "Amt",
      linesOfText: ["Minister der Finanzen"],
    });

    const nameCell = createCell({
      header: "Name",
      linesOfText: ["Daniel Keller"],
      colStart: 2,
      colEnd: 2,
    });

    const partyCell = createCell({
      header: "Partei",
      linesOfText: ["SPD"],
      colStart: 4,
      colEnd: 4,
    });

    // No imageUrl cell in the row
    const cells = [amtCell, nameCell, partyCell];

    const bundesland = {
      state: "Brandenburg",
      urlCabinet: "https://de.wikipedia.org/wiki/Kabinett_Woidke_V",
    };

    const politicians = extractPoliticians([amtCell], cells, bundesland);

    expect(politicians).toHaveLength(1);
    expect(politicians[0]).toEqual({
      amt: "Minister der Finanzen",
      name: "Daniel Keller",
      party: "SPD",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Portrait_placeholder.svg/400px-Portrait_placeholder.svg.png",
    });
  });
});
