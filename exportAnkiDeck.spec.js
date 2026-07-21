import { deckNameFor } from "./exportAnkiDeck.js";

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
