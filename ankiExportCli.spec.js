import { jest } from "@jest/globals";

const exportOutputFileToApkgMock = jest.fn();

jest.unstable_mockModule("./src/apkgFileExport.js", () => ({
  exportOutputFileToApkg: exportOutputFileToApkgMock,
}));

const { run, UsageError } = await import("./ankiExportCli.js");

describe("run", () => {
  const originalArg = process.argv[2];

  afterEach(() => {
    process.argv[2] = originalArg;
    exportOutputFileToApkgMock.mockReset();
  });

  it("throws a UsageError when no path argument is given", async () => {
    process.argv[2] = undefined;

    await expect(run()).rejects.toThrow(UsageError);
    await expect(run()).rejects.toThrow(
      "Usage: node ankiExportCli.js <path-to-output-json-file>",
    );
    expect(exportOutputFileToApkgMock).not.toHaveBeenCalled();
  });

  it("throws a UsageError when the path does not exist", async () => {
    process.argv[2] = "output/does-not-exist.json";

    await expect(run()).rejects.toThrow(UsageError);
    await expect(run()).rejects.toThrow("File not found: output/does-not-exist.json");
    expect(exportOutputFileToApkgMock).not.toHaveBeenCalled();
  });

  it("delegates to exportOutputFileToApkg for an existing path", async () => {
    process.argv[2] = "output/bundesregierung.json";

    await run();

    expect(exportOutputFileToApkgMock).toHaveBeenCalledWith("output/bundesregierung.json");
  });
});
