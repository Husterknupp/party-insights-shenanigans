import { loadCheerio, getParentExn } from "./cheerioFacade.res.mjs";

/**
 * This test suite explores the difference between queriedCheerio and cheerioElement
 * using the CheerioFacade's loadCheerio helper and direct DOM traversal.
 */

describe("CheerioFacade: queriedCheerio vs cheerioElement", () => {
  const html = `
    <div>
      <p id="p1">Hello <span>world</span></p>
      <p id="p2">Another <b>line</b></p>
    </div>
  `;

  test("selector function (`$()`) returns a queriedCheerio, .toArray() returns cheerioElements", () => {
    const $ = loadCheerio(html);
    // $ is a function: (selector) => queriedCheerio
    const pNodes = $("p");
    expect(pNodes).not.toHaveProperty("name");

    expect(typeof pNodes.toArray).toBe("function");
    const arr = pNodes.toArray();
    // arr[0] is a cheerioElement, cheerioElement has a `name` property
    expect(arr[0]).toHaveProperty("name", "p");
  });

  test("index access and toArray() are not equivalent (ArrayLike vs Array)", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");
    const arr = pNodes.toArray();

    // queriedCheerio is ArrayLike, it has some but not all Array methods
    expect(typeof pNodes.forEach).toBe("undefined");
    // toArray() returns a proper array of cheerioElements
    expect(typeof arr.forEach).toBe("function");
    expect(arr[0]).toHaveProperty("name", "p");

    // accessing by index also returns a cheerioElement
    expect(pNodes[0]).toHaveProperty("name", "p");
  });

  test("queriedCheerio methods vs cheerioElement properties", () => {
    // cheerioElement is a plain node, queriedCheerio is a cheerio wrapper

    const $ = loadCheerio(html);

    const pNodes = $("p");
    // queriedCheerio has .find, .text, .toArray, etc.
    expect(pNodes).not.toHaveProperty("name");
    expect(pNodes).toHaveProperty("parent");
    expect(typeof pNodes.parent).toBe("function");
    expect(pNodes).toHaveProperty("children");
    expect(typeof pNodes.children).toBe("function");
    expect(pNodes).toHaveProperty("find");
    expect(typeof pNodes.find).toBe("function");
    expect(pNodes).toHaveProperty("text");
    expect(typeof pNodes.text).toBe("function");
    expect(pNodes).toHaveProperty("toArray");
    expect(typeof pNodes.toArray).toBe("function");
    expect(pNodes).toHaveProperty("length");
    expect(typeof pNodes.length).toBe("number");
    expect(pNodes).toHaveProperty("each");
    expect(typeof pNodes.each).toBe("function");
    expect(pNodes).toHaveProperty("remove");
    expect(typeof pNodes.remove).toBe("function");
    expect(pNodes).toHaveProperty("contents");
    expect(typeof pNodes.contents).toBe("function");
    expect(pNodes).toHaveProperty("first");
    expect(typeof pNodes.first).toBe("function");
    expect(pNodes).toHaveProperty("next");
    expect(typeof pNodes.next).toBe("function");
    expect(pNodes).toHaveProperty("last");
    expect(typeof pNodes.last).toBe("function");
    expect(pNodes).toHaveProperty("prev");
    expect(typeof pNodes.prev).toBe("function");
    expect(pNodes).not.toHaveProperty("type");
    expect(pNodes).toHaveProperty("data");
    expect(typeof pNodes.data).toBe("function");
    expect(pNodes).not.toHaveProperty("attribs");
    expect(pNodes).toHaveProperty("attr");
    expect(typeof pNodes.attr).toBe("function");
    expect(pNodes).toHaveProperty("html");
    expect(typeof pNodes.html).toBe("function");

    const firstP = pNodes.toArray()[0];
    // cheerioElement has .name, .children, etc.
    expect(firstP).toHaveProperty("name");
    expect(typeof firstP.parent).toBe("object");
    expect(firstP).toHaveProperty("children");
    expect(Array.isArray(firstP.children)).toBe(true);
    expect(firstP).not.toHaveProperty("find");
    expect(firstP).not.toHaveProperty("text");
    expect(firstP).not.toHaveProperty("toArray");
    expect(firstP).not.toHaveProperty("length");
    expect(firstP).not.toHaveProperty("each");
    expect(firstP).not.toHaveProperty("remove");
    expect(firstP).not.toHaveProperty("contents");
    expect(firstP).not.toHaveProperty("first");
    expect(typeof firstP.next).toBe("object");
    expect(firstP).not.toHaveProperty("last");
    expect(typeof firstP.prev).toBe("object");
    expect(firstP).toHaveProperty("type");
    expect(firstP).not.toHaveProperty("data");
    expect(typeof firstP.attribs).toBe("object");
    expect(firstP).not.toHaveProperty("attr");
    expect(firstP).not.toHaveProperty("html");
  });

  test("nextAll works as expected, and is callable on queriedCheerio, not on cheerioElement", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");
    const arr = pNodes.toArray();
    const firstP = arr[0];

    // nextAll is a method of queriedCheerio, not cheerioElement
    expect(typeof pNodes.nextAll).toBe("function");
    expect(firstP.nextAll).toBeUndefined();
    // Also, first should be a method of queriedCheerio, not cheerioElement
    expect(typeof pNodes.first).toBe("function");
    expect(firstP.first).toBeUndefined();

    // Check that nextAll works as expected
    const nextP2 = pNodes.nextAll("#p2");
    expect(nextP2.length).toBe(1);
    expect(nextP2[0]).toHaveProperty("name", "p");
    expect(nextP2[0].attribs.id).toBe("p2");
    // Also, nextAll() returns a queriedCheerio, not a cheerioElement
    expect(nextP2).not.toHaveProperty("name");
    expect(nextP2).toHaveProperty("find");
  });

  test("queriedCheerio.first() returns a queriedCheerio, not a cheerioElement", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");

    const firstP = pNodes.first();

    expect(firstP).not.toHaveProperty("name");
    expect(firstP).toHaveProperty("find");
  });

  test("queriedCheerio.last() returns a queriedCheerio, not a cheerioElement", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");

    const lastP = pNodes.last();

    expect(lastP).not.toHaveProperty("name");
  });

  test("queriedCheerio.each() accepts a callback with second argument a cheerioElement, not a queriedCheerio", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");

    pNodes.each((_, el) => {
      expect(el).toHaveProperty("name");
      expect(el).not.toHaveProperty("find");
    });
  });

  test("queriedCheerio.last() returns a queriedCheerio, not a cheerioElement", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");

    const lastP = pNodes.last();

    expect(lastP).not.toHaveProperty("name");
  });

  test("queriedCheerio.betterSelectorFunction accepts as `basicAcceptedElems` variant a queriedCheerio", () => {
    const $ = loadCheerio(html);

    const node = $("p").first();
    const pNodes = $(undefined, {
      TAG: "AnyNode",
      _0: node,
    });

    expect(pNodes.length).toBe(1);
    expect(pNodes).not.toHaveProperty("name");
    expect(pNodes).toHaveProperty("find");
  });

  test("queriedCheerio.betterSelectorFunction accepts as `basicAcceptedElems` variant a cheerioElement", () => {
    const $ = loadCheerio(html);

    const node = $("p").toArray()[0];
    const pNodes = $(undefined, {
      TAG: "AnyNode",
      _0: node,
    });

    expect(pNodes.length).toBe(1);
    expect(pNodes).not.toHaveProperty("name");
    expect(pNodes).toHaveProperty("find");
  });

  test("queriedCheerio.betterSelectorFunction accepts as `basicAcceptedElems` variant a string", () => {
    const $ = loadCheerio(html);

    const pNodes = $(undefined, {
      TAG: "StringSelector",
      _0: "p",
    });

    expect(pNodes).not.toHaveProperty("name");
    expect(pNodes).toHaveProperty("find");
  });

  test("queriedCheerio.parent() returns a queriedCheerio, not a cheerioElement", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");

    const parent = pNodes.parent();

    expect(parent).not.toHaveProperty("name");
  });

  test("queriedCheerio.parent() always returns a queriedCheerio, even if no parent exists", () => {
    const $ = loadCheerio(html);
    const divNode = $("div");

    // No parent for the div, so it should return an empty queriedCheerio
    let parent = divNode.parent();

    expect(parent.length).toBe(0); // Should return an empty queriedCheerio
    expect(parent).not.toHaveProperty("name");
    expect(parent).toHaveProperty("find");

    const pNode = $("p");

    // p has a parent, so it should return the parent
    parent = pNode.parent();

    expect(parent.length).toBe(1);
    expect(parent).not.toHaveProperty("name");
    expect(parent).toHaveProperty("find");
  });

  test("queriedCheerio.getParentExn() returns the parent as a cheerioElement", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p").toArray()[0];

    const parent = getParentExn(pNodes);

    expect(parent).toHaveProperty("name", "div");
    expect(parent).toHaveProperty("children");
  });

  test("queriedCheerio.getParentExn() throws if there's no parent", () => {
    const $ = loadCheerio(html);
    const pNodes = $("div").toArray()[0];
    expect(() => getParentExn(pNodes.parent)).toThrow();
  });

  test("queriedCheerio.html() returns the HTML of the queriedCheerio", () => {
    const $ = loadCheerio(html);
    const pNodes = $("p");

    const htmlContent = pNodes.html();
    expect(htmlContent).toBe("Hello <span>world</span>");
  });

  test("queriedCheerio.html() returns an empty string if no content", () => {
    const $ = loadCheerio("<div></div>");
    const divNode = $("div");

    const htmlContent = divNode.html();
    expect(htmlContent).toBe("");
  });
});
