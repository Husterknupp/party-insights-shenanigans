import { cardFieldsFor } from "./ankiExporter.res.mjs";

describe("cardFieldsFor", () => {
  it("uses 'amt' as front when present", () => {
    const politician = {
      amt: "Bundeskanzler",
      state: undefined,
      name: "Friedrich Merz",
      party: "CDU",
    };

    expect(cardFieldsFor(politician)).toEqual(["Bundeskanzler", "Friedrich Merz (CDU)"]);
  });

  it("falls back to 'state' as front when 'amt' is missing", () => {
    const politician = {
      amt: undefined,
      state: "Bayern",
      name: "Markus Söder",
      party: "CSU",
    };

    expect(cardFieldsFor(politician)).toEqual(["Bayern", "Markus Söder (CSU)"]);
  });

  it("throws when neither 'amt' nor 'state' is present", () => {
    const politician = {
      amt: undefined,
      state: undefined,
      name: "Jane Doe",
      party: "N/A",
    };

    expect(() => cardFieldsFor(politician)).toThrow();
  });
});
