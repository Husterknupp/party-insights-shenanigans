import { fieldsFor } from "./ankiDeckBuilder.res.mjs";

describe("fieldsFor", () => {
  it("uses 'amt' as the Amt/Ministerium field when present", () => {
    const politician = {
      amt: "Bundeskanzler",
      state: undefined,
      name: "Friedrich Merz",
      party: "CDU",
    };

    expect(fieldsFor(politician)).toEqual([
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      "",
    ]);
  });

  it("falls back to 'state' as the Amt/Ministerium field when 'amt' is missing", () => {
    const politician = {
      amt: undefined,
      state: "Bayern",
      name: "Markus Söder",
      party: "CSU",
    };

    expect(fieldsFor(politician)).toEqual([
      "Markus Söder",
      "CSU",
      "Bayern",
      "",
    ]);
  });

  it("throws when neither 'amt' nor 'state' is present", () => {
    const politician = {
      amt: undefined,
      state: undefined,
      name: "Jane Doe",
      party: "N/A",
    };

    expect(() => fieldsFor(politician)).toThrow();
  });
});
