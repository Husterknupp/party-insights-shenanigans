import { jest } from "@jest/globals";

// axios must be mocked before ankiExporter.res.mjs (which pulls in axios.res.mjs) is
// ever imported anywhere in this file, so this stays a dedicated spec file rather than
// living alongside the unmocked tests in ankiExporter.spec.js.
const axiosGetMock = jest.fn();

jest.unstable_mockModule("axios", () => ({
  default: { get: axiosGetMock },
}));

const { _fileExtensionFor, _downloadMediaFor } = await import("./ankiExporter.res.mjs");

describe("_fileExtensionFor", () => {
  it("extracts a known extension from the URL path", () => {
    expect(_fileExtensionFor("https://example.com/foo/bar.PNG")).toBe("png");
  });

  it("ignores query strings when detecting the extension", () => {
    expect(_fileExtensionFor("https://example.com/foo/bar.jpg?width=500")).toBe("jpg");
  });

  it("falls back to jpg for an unrecognized extension", () => {
    expect(_fileExtensionFor("https://example.com/foo/bar.tiff")).toBe("jpg");
  });

  it("falls back to jpg when there is no extension at all", () => {
    expect(_fileExtensionFor("https://example.com/foo/bar")).toBe("jpg");
  });
});

describe("_downloadMediaFor", () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
  });

  it("downloads the image and returns an index-based filename alongside the data", async () => {
    const buffer = Buffer.from("fake-image-bytes");
    axiosGetMock.mockResolvedValue({ data: buffer });

    const result = await _downloadMediaFor(
      { name: "Jane Doe", party: "N/A", imageUrl: "https://example.com/jane.png" },
      3,
    );

    expect(result).toEqual(["3.png", buffer]);
    expect(axiosGetMock).toHaveBeenCalledWith(
      "https://example.com/jane.png",
      expect.objectContaining({ responseType: "arraybuffer" }),
    );
  });

  it("skips a politician with an empty image URL without calling axios", async () => {
    const result = await _downloadMediaFor({ name: "Jane Doe", party: "N/A", imageUrl: "" }, 0);

    expect(result).toBeUndefined();
    expect(axiosGetMock).not.toHaveBeenCalled();
  });

  it("skips a politician with a placeholder image URL without calling axios", async () => {
    const result = await _downloadMediaFor(
      { name: "Jane Doe", party: "N/A", imageUrl: "replace_this_image.jpg" },
      0,
    );

    expect(result).toBeUndefined();
    expect(axiosGetMock).not.toHaveBeenCalled();
  });

  it("skips (without throwing) when the download rejects", async () => {
    axiosGetMock.mockRejectedValue(new Error("404 Not Found"));

    const result = await _downloadMediaFor(
      { name: "Jane Doe", party: "N/A", imageUrl: "https://example.com/broken.png" },
      0,
    );

    expect(result).toBeUndefined();
  });
});
