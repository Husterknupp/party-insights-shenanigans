import {
  makeMultiFieldExporter,
  addNote,
  POLITICIAN_MODEL_ID,
  POLITICIAN_MODEL_NAME,
  POLITICIAN_FIELDS,
} from "./multiFieldApkg.js";

const notes = (exporter) =>
  exporter.db.exec("select id, mid, flds from notes")[0]?.values ?? [];
const cards = (exporter) =>
  exporter.db.exec("select id, nid, ord from cards")[0]?.values ?? [];
const model = (exporter) => {
  const modelsJson = exporter.db.exec("select models from col")[0].values[0][0];
  return JSON.parse(modelsJson)[POLITICIAN_MODEL_ID];
};

describe("makeMultiFieldExporter", () => {
  it("re-keys the note type onto the fixed model id and name, not a fresh per-run one", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    expect(model(exporter).id).toBe(POLITICIAN_MODEL_ID);
    expect(model(exporter).name).toBe(POLITICIAN_MODEL_NAME);
  });

  it("produces the same model id/name across independently-built decks", () => {
    const first = makeMultiFieldExporter("DeckOne");
    const second = makeMultiFieldExporter("DeckTwo");

    expect(model(first).id).toBe(model(second).id);
    expect(model(first).name).toBe(model(second).name);
  });

  it("defines the 4 politician fields in order and both card templates", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");
    const m = model(exporter);

    expect(m.flds.map((f) => f.name)).toEqual(POLITICIAN_FIELDS);
    expect(m.tmpls.map((t) => t.name)).toEqual(["Card 1", "Card 2"]);
  });
});

describe("addNote", () => {
  it("writes a note with all 4 fields joined by the Anki field separator", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);

    const [[, mid, flds]] = notes(exporter);
    expect(mid).toBe(POLITICIAN_MODEL_ID);
    expect(flds).toBe('Friedrich MerzCDUBundeskanzler<img src="0.jpg">');
  });

  it("generates both cards when both Amt/Ministerium and Profil-Photo are present", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);

    const [[noteId]] = notes(exporter);
    const cardOrds = cards(exporter)
      .filter(([, nid]) => nid === noteId)
      .map(([, , ord]) => ord)
      .sort();
    expect(cardOrds).toEqual([0, 1]);
  });

  it("skips Card 2 when Profil-Photo is empty (e.g. a politician without an image)", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, ["Jane Doe", "N/A", "Ministerin", ""]);

    const [[noteId]] = notes(exporter);
    const cardOrds = cards(exporter)
      .filter(([, nid]) => nid === noteId)
      .map(([, , ord]) => ord);
    expect(cardOrds).toEqual([0]);
  });

  it("gives each card of a note its own id instead of colliding on 'insert or replace'", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);

    const [[noteId]] = notes(exporter);
    const cardIds = cards(exporter)
      .filter(([, nid]) => nid === noteId)
      .map(([id]) => id);
    expect(cardIds.length).toBe(2);
    expect(new Set(cardIds).size).toBe(2);
  });

  it("keeps notes independent across multiple addNote calls", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);
    addNote(exporter, ["Jane Doe", "N/A", "Ministerin", ""]);

    expect(notes(exporter).length).toBe(2);
    expect(cards(exporter).length).toBe(3);
  });
});
