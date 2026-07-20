import { normalizeWikiImageUrl } from "./ImageUrl.res.mjs";

describe("normalizeWikiImageUrl", () => {
  test("rewrites a protocol-relative thumbnail URL to 500px with an https scheme", () => {
    expect(
      normalizeWikiImageUrl(
        "//upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Wadephul%2C_Johann-1249.jpg/74px-Wadephul%2C_Johann-1249.jpg",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Wadephul%2C_Johann-1249.jpg/500px-Wadephul%2C_Johann-1249.jpg",
    );
  });

  test("rewrites an already-absolute thumbnail URL to 500px", () => {
    expect(
      normalizeWikiImageUrl(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/PetravonOlschowski_Web.jpg/120px-PetravonOlschowski_Web.jpg",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/PetravonOlschowski_Web.jpg/500px-PetravonOlschowski_Web.jpg",
    );
  });

  test("converts a .tif source file to a .png thumbnail, matching what Wikimedia serves", () => {
    expect(
      normalizeWikiImageUrl(
        "//upload.wikimedia.org/wikipedia/commons/thumb/1/12/Example.tif/120px-Example.tif.png",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Example.tif/500px-Example.png",
    );
  });

  test("keeps the .svg extension and appends .png for a .svg source file, matching what Wikimedia serves", () => {
    expect(
      normalizeWikiImageUrl(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Silver_-_replace_this_image_male.svg/120px-Silver_-_replace_this_image_male.svg.png",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Silver_-_replace_this_image_male.svg/500px-Silver_-_replace_this_image_male.svg.png",
    );
  });
});
