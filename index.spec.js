import { jest } from "@jest/globals";

// Mock all three extractor modules before importing run()
jest.unstable_mockModule("./src/ministerpraesidenten.js", () => ({
  default: jest.fn(),
}));
jest.unstable_mockModule("./src/bundesregierung.js", () => ({
  default: jest.fn(),
  findRelevantTable: jest.fn(),
}));
jest.unstable_mockModule("./src/landesregierungen.res.mjs", () => ({
  extract: jest.fn(),
}));

const { run } = await import("./index.js");
const { default: extractMinisterpraesidenten } = await import(
  "./src/ministerpraesidenten.js"
);
const { default: extractBundesregierung } = await import(
  "./src/bundesregierung.js"
);
const { extract: extractLandesregierungen } = await import(
  "./src/landesregierungen.res.mjs"
);

describe("run()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("resolves when all extractors succeed", async () => {
    extractMinisterpraesidenten.mockResolvedValue();
    extractBundesregierung.mockResolvedValue();
    extractLandesregierungen.mockResolvedValue();

    await expect(run()).resolves.toBeUndefined();
  });

  test("rejects (and does NOT swallow) errors from extractors", async () => {
    const httpError = new Error("AxiosError: Request failed with status code 403");
    extractMinisterpraesidenten.mockRejectedValue(httpError);

    await expect(run()).rejects.toThrow("403");
  });

  test("rejects when bundesregierung extractor fails", async () => {
    extractMinisterpraesidenten.mockResolvedValue();
    const httpError = new Error("AxiosError: Request failed with status code 429");
    extractBundesregierung.mockRejectedValue(httpError);

    await expect(run()).rejects.toThrow("429");
  });
});
